import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { PLAN_LIMITS, PLAN_SEATS, type PlanId } from "../lib/plans.js";
import { getUsageForProfile } from "../lib/usage.js";

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/me", async (req, reply) => {
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

    return {
      profile: {
        id: req.profile!.id,
        clerkUserId: req.profile!.clerk_user_id,
        email: req.profile!.email,
        fullName: req.profile!.full_name,
        avatarUrl: req.profile!.avatar_url,
      },
      workspace: req.organization
        ? {
            type: "organization",
            id: req.organization.id,
            clerkOrganizationId: req.organization.clerk_org_id,
            name: req.organization.name,
            role: req.membership?.role ?? "member",
          }
        : {
            type: "personal",
            id: req.profile!.id,
            role: "owner",
          },
      subscription: {
        plan,
        status: req.subscription!.status,
        provider: req.subscription!.provider,
        currentPeriodEnd: req.subscription!.current_period_end,
      },
      entitlements: {
        limits: PLAN_LIMITS[plan],
        seats: PLAN_SEATS[plan],
      },
      usage,
    };
  });
};
