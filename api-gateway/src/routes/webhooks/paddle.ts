import type { FastifyPluginAsync } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env.js";
import { getSupabase } from "../../lib/supabase.js";

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    custom_data?: {
      profile_id?: string;
      clerk_user_id?: string;
      plan?: string;
    };
    items?: Array<{ price?: { id?: string } }>;
    current_billing_period?: { ends_at?: string };
  };
};

function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  // Paddle Billing: ts=...;h1=...
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const payload = `${ts}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(h1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function planFromPriceId(priceId?: string): "pro" | "team" | null {
  if (!priceId) return null;
  if (
    priceId === env.PADDLE_PRICE_PRO_MONTHLY ||
    priceId === env.PADDLE_PRICE_PRO_YEARLY
  ) {
    return "pro";
  }
  if (
    priceId === env.PADDLE_PRICE_TEAM_MONTHLY ||
    priceId === env.PADDLE_PRICE_TEAM_YEARLY
  ) {
    return "team";
  }
  return null;
}

export const paddleWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/webhooks/paddle", async (req, reply) => {
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

    if (env.PADDLE_WEBHOOK_SECRET) {
      const sig = req.headers["paddle-signature"] as string | undefined;
      const ok = verifyPaddleSignature(rawBody, sig, env.PADDLE_WEBHOOK_SECRET);
      if (!ok) {
        return reply.status(401).send({ error: "Invalid Paddle signature" });
      }
    } else if (env.NODE_ENV === "production") {
      return reply.status(500).send({ error: "PADDLE_WEBHOOK_SECRET not set" });
    }

    let event: PaddleEvent;
    try {
      event = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as PaddleEvent);
    } catch {
      return reply.status(400).send({ error: "Invalid JSON" });
    }

    const type = event.event_type ?? "";
    const data = event.data ?? {};
    const sb = getSupabase();

    const profileId = data.custom_data?.profile_id;
    const priceId = data.items?.[0]?.price?.id;
    const plan =
      (data.custom_data?.plan as "pro" | "team" | undefined) ??
      planFromPriceId(priceId) ??
      "pro";

    if (
      type === "subscription.created" ||
      type === "subscription.activated" ||
      type === "subscription.updated" ||
      type === "transaction.completed"
    ) {
      if (!profileId) {
        console.warn("paddle webhook missing profile_id", type, event.event_id);
        return { ok: true, skipped: true };
      }

      const status =
        data.status === "canceled" || data.status === "cancelled"
          ? "canceled"
          : data.status === "past_due"
            ? "past_due"
            : "active";

      const { error } = await sb.from("subscriptions").upsert(
        {
          profile_id: profileId,
          plan: status === "canceled" ? "free" : plan,
          status: status === "canceled" ? "canceled" : status,
          provider: "paddle",
          paddle_customer_id: data.customer_id ?? null,
          paddle_subscription_id: data.id ?? null,
          current_period_end: data.current_billing_period?.ends_at ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );

      // If no unique on profile_id alone, fall back to update/insert
      if (error) {
        const { data: existing } = await sb
          .from("subscriptions")
          .select("id")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (existing) {
          await sb
            .from("subscriptions")
            .update({
              plan: status === "canceled" ? "free" : plan,
              status: status === "canceled" ? "canceled" : status,
              paddle_customer_id: data.customer_id ?? null,
              paddle_subscription_id: data.id ?? null,
              current_period_end: data.current_billing_period?.ends_at ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await sb.from("subscriptions").insert({
            profile_id: profileId,
            plan: status === "canceled" ? "free" : plan,
            status: status === "canceled" ? "canceled" : status,
            provider: "paddle",
            paddle_customer_id: data.customer_id ?? null,
            paddle_subscription_id: data.id ?? null,
            current_period_end: data.current_billing_period?.ends_at ?? null,
          });
        }
      }
    }

    if (type === "subscription.canceled" || type === "subscription.past_due") {
      if (profileId) {
        await sb
          .from("subscriptions")
          .update({
            plan: type === "subscription.canceled" ? "free" : undefined,
            status: type === "subscription.canceled" ? "canceled" : "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", profileId);
      }
    }

    return { ok: true, event: type };
  });
};
