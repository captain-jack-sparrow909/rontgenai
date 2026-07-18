import type { FastifyPluginAsync } from "fastify";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { createHash } from "node:crypto";
import { env } from "../../env.js";
import { ensureProfile } from "../../lib/profiles.js";
import { getSupabase } from "../../lib/supabase.js";

type ClerkEvent = {
  type?: string;
  data?: Record<string, unknown>;
};

function headersFromRequest(headers: Record<string, unknown>): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") result.set(key, value);
    else if (Array.isArray(value)) result.set(key, value.join(","));
  }
  return result;
}

function localRole(value: unknown): "owner" | "admin" | "member" {
  if (value === "owner" || value === "org:owner") return "owner";
  if (value === "admin" || value === "org:admin") return "admin";
  return "member";
}

export const clerkWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/webhooks/clerk", async (request, reply) => {
    const rawBody =
      request.rawBody ??
      (typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body ?? {}));

    let event: ClerkEvent;
    if (env.CLERK_WEBHOOK_SECRET) {
      try {
        event = (await verifyWebhook(
          new Request(`${env.APP_URL}/v1/webhooks/clerk`, {
            method: "POST",
            headers: headersFromRequest(request.headers),
            body: rawBody,
          }),
          { signingSecret: env.CLERK_WEBHOOK_SECRET },
        )) as unknown as ClerkEvent;
      } catch {
        return reply.status(401).send({ error: "Invalid Clerk webhook signature" });
      }
    } else {
      if (env.NODE_ENV === "production") {
        return reply.status(500).send({ error: "CLERK_WEBHOOK_SECRET not set" });
      }
      try {
        event = JSON.parse(rawBody) as ClerkEvent;
      } catch {
        return reply.status(400).send({ error: "Invalid JSON" });
      }
    }

    const data = event.data ?? {};
    const type = event.type ?? "";
    const sb = getSupabase();
    const eventIdHeader = request.headers["svix-id"];
    const eventId =
      (typeof eventIdHeader === "string" ? eventIdHeader : null) ??
      createHash("sha256").update(rawBody).digest("hex");
    const { error: eventError } = await sb.from("webhook_events").insert({
      provider: "clerk",
      event_id: eventId,
      event_type: type,
      payload_hash: createHash("sha256").update(rawBody).digest("hex"),
      status: "processing",
    });
    if (eventError?.code === "23505") {
      return { ok: true, duplicate: true, type };
    }
    if (eventError) return reply.status(500).send({ error: eventError.message });

    if (type === "user.created" || type === "user.updated") {
      const id = typeof data.id === "string" ? data.id : null;
      if (!id) return reply.status(400).send({ error: "Missing user id" });
      const emails = Array.isArray(data.email_addresses)
        ? (data.email_addresses as Array<{ email_address?: string }>)
        : [];
      await ensureProfile({
        clerkUserId: id,
        email: emails[0]?.email_address ?? null,
        fullName:
          [data.first_name, data.last_name]
            .filter((value): value is string => typeof value === "string" && Boolean(value))
            .join(" ") || null,
        avatarUrl: typeof data.image_url === "string" ? data.image_url : null,
      });
    }

    if (type === "organization.created" || type === "organization.updated") {
      const id = typeof data.id === "string" ? data.id : null;
      if (!id) return reply.status(400).send({ error: "Missing organization id" });
      await sb.from("organizations").upsert(
        {
          clerk_org_id: id,
          name: typeof data.name === "string" ? data.name : id,
        },
        { onConflict: "clerk_org_id" },
      );
    }

    if (type.startsWith("organizationMembership.")) {
      const organization = data.organization as { id?: string; name?: string } | undefined;
      const publicUser = data.public_user_data as { user_id?: string } | undefined;
      if (organization?.id && publicUser?.user_id) {
        const { data: profile } = await sb.from("profiles").select("id")
          .eq("clerk_user_id", publicUser.user_id).maybeSingle();
        const { data: storedOrganization } = await sb.from("organizations")
          .upsert(
            { clerk_org_id: organization.id, name: organization.name ?? organization.id },
            { onConflict: "clerk_org_id" },
          )
          .select("id")
          .single();
        if (profile && storedOrganization) {
          if (type === "organizationMembership.deleted") {
            await sb.from("memberships").delete()
              .eq("organization_id", storedOrganization.id).eq("profile_id", profile.id);
          } else {
            await sb.from("memberships").upsert(
              {
                organization_id: storedOrganization.id,
                profile_id: profile.id,
                role: localRole(data.role),
              },
              { onConflict: "organization_id,profile_id" },
            );
          }
        }
      }
    }

    await sb.from("webhook_events").update({
      status: "processed",
      processed_at: new Date().toISOString(),
    }).eq("provider", "clerk").eq("event_id", eventId);
    return { ok: true, type };
  });
};
