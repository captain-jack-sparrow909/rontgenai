import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../plugins/auth.js";
import type { PlanId, ProductId } from "../lib/plans.js";
import { getUsageForProfile, recordUsage } from "../lib/usage.js";

const recordSchema = z.object({
  product: z.enum([
    "blueprint",
    "pulse",
    "atlas",
    "sentinel",
    "forge",
    "radar",
    "relay",
  ]),
  units: z.number().int().positive().max(100).optional().default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const usageRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/usage", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const usage = await getUsageForProfile(
      req.profile!.id,
      req.auth!.clerkUserId,
      plan,
      req.organization?.id ?? null,
    );

    return { plan, usage };
  });

  app.post("/v1/usage", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const result = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product: parsed.data.product as ProductId,
      plan,
      units: parsed.data.units,
      metadata: parsed.data.metadata,
    });

    if (!result.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...result,
        upgradeUrl: "/app/billing",
      });
    }

    return { ok: true, ...result };
  });
};
