import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { requireAuth } from "../plugins/auth.js";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "team"]),
  interval: z.enum(["month", "year"]).default("month"),
});

function priceIdFor(
  plan: "pro" | "team",
  interval: "month" | "year",
): string | undefined {
  if (plan === "pro" && interval === "month") return env.PADDLE_PRICE_PRO_MONTHLY;
  if (plan === "pro" && interval === "year") return env.PADDLE_PRICE_PRO_YEARLY;
  if (plan === "team" && interval === "month") return env.PADDLE_PRICE_TEAM_MONTHLY;
  if (plan === "team" && interval === "year") return env.PADDLE_PRICE_TEAM_YEARLY;
  return undefined;
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/billing/prices", async () => ({
    env: env.PADDLE_ENV,
    prices: {
      pro: {
        month: env.PADDLE_PRICE_PRO_MONTHLY ?? null,
        year: env.PADDLE_PRICE_PRO_YEARLY ?? null,
      },
      team: {
        month: env.PADDLE_PRICE_TEAM_MONTHLY ?? null,
        year: env.PADDLE_PRICE_TEAM_YEARLY ?? null,
      },
    },
  }));

  /**
   * Returns Paddle checkout parameters for the web client overlay.
   */
  app.post("/v1/billing/checkout", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const { plan, interval } = parsed.data;
    const priceId = priceIdFor(plan, interval);

    if (!priceId) {
      return reply.status(503).send({
        error:
          "Paddle price IDs not configured. Set PADDLE_PRICE_* env vars for the selected plan.",
        plan,
        interval,
      });
    }

    return {
      ok: true,
      provider: "paddle",
      env: env.PADDLE_ENV,
      priceId,
      customer: {
        email: req.auth!.email,
        clerkUserId: req.auth!.clerkUserId,
        profileId: req.profile!.id,
      },
      customData: {
        profile_id: req.profile!.id,
        clerk_user_id: req.auth!.clerkUserId,
        plan,
        interval,
      },
      successUrl: `${env.APP_URL}/app/billing?checkout=success`,
      cancelUrl: `${env.APP_URL}/app/billing?checkout=cancel`,
    };
  });
};
