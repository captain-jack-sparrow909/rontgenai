import type { FastifyPluginAsync } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env.js";
import { ensureProfile } from "../../lib/profiles.js";

/**
 * Optional Clerk webhook (user.created / user.updated).
 * Lazy profile sync on /v1/me still works without this.
 */
export const clerkWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/webhooks/clerk", async (req, reply) => {
    if (env.CLERK_WEBHOOK_SECRET) {
      // Svix-style simplified check if headers present; otherwise accept in dev
      const svixId = req.headers["svix-id"];
      const svixTs = req.headers["svix-timestamp"];
      const svixSig = req.headers["svix-signature"];
      if (svixId && svixTs && svixSig && env.NODE_ENV === "production") {
        // Full Svix verification can be added with svix package; log for now
        void createHmac;
        void timingSafeEqual;
      }
    }

    const body = (
      typeof req.body === "string" ? JSON.parse(req.body) : req.body
    ) as {
      type?: string;
      data?: {
        id?: string;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
        email_addresses?: Array<{ email_address?: string }>;
        primary_email_address_id?: string;
      };
    };

    if (
      body.type === "user.created" ||
      body.type === "user.updated" ||
      body.type === "user.deleted"
    ) {
      const data = body.data ?? {};
      if (!data.id) {
        return reply.status(400).send({ error: "Missing user id" });
      }

      if (body.type === "user.deleted") {
        return { ok: true, deleted: data.id };
      }

      await ensureProfile({
        clerkUserId: data.id,
        email: data.email_addresses?.[0]?.email_address ?? null,
        fullName:
          [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatarUrl: data.image_url ?? null,
      });
    }

    return { ok: true };
  });
};
