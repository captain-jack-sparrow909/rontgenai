import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "../env.js";
import { ensureProfile } from "../lib/profiles.js";
import { getSupabase, type Profile, type Subscription } from "../lib/supabase.js";

export type WorkspaceRole = "owner" | "admin" | "member";
export type Organization = {
  id: string;
  clerk_org_id: string;
  name: string;
};
export type Membership = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: WorkspaceRole;
};

export type AuthUser = {
  clerkUserId: string;
  sessionId?: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  clerkOrganizationId?: string | null;
  organizationRole?: string | null;
};

export type AuthedRequest = FastifyRequest & {
  auth: AuthUser;
  profile: Profile;
  subscription: Subscription;
};

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthUser;
    profile?: Profile;
    subscription?: Subscription;
    organization?: Organization;
    membership?: Membership;
  }
}

async function extractBearer(req: FastifyRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("auth", undefined);
  app.decorateRequest("profile", undefined);
  app.decorateRequest("subscription", undefined);
  app.decorateRequest("organization", undefined);
  app.decorateRequest("membership", undefined);
};

function workspaceRole(clerkRole: string | undefined): WorkspaceRole {
  if (clerkRole === "org:admin" || clerkRole === "admin") return "admin";
  if (clerkRole === "owner" || clerkRole === "org:owner") return "owner";
  return "member";
}

/** Require valid Clerk session JWT and ensure Supabase profile exists. */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  const token = await extractBearer(req);
  if (!token) {
    const err = new Error("Missing Authorization bearer token");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  let payload: {
    sub: string;
    sid?: string;
    org_id?: string;
    org_role?: string;
  };
  try {
    payload = (await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    })) as {
      sub: string;
      sid?: string;
      org_id?: string;
      org_role?: string;
    };
  } catch {
    const err = new Error("Invalid or expired session token");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  const clerkUserId = payload.sub;
  let email: string | null = null;
  let fullName: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const user = await clerk.users.getUser(clerkUserId);
    email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
    fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      null;
    avatarUrl = user.imageUrl ?? null;
  } catch (e) {
    console.warn("clerk user fetch failed", e);
  }

  const { profile, subscription: personalSubscription } = await ensureProfile({
    clerkUserId,
    email,
    fullName,
    avatarUrl,
  });

  let subscription = personalSubscription;
  if (payload.org_id) {
    const sb = getSupabase();
    const { data: existingOrganization, error: organizationLookupError } = await sb
      .from("organizations")
      .select("id,clerk_org_id,name")
      .eq("clerk_org_id", payload.org_id)
      .maybeSingle();
    if (organizationLookupError) {
      throw new Error(`organization lookup failed: ${organizationLookupError.message}`);
    }
    let organization = existingOrganization;
    if (!organization) {
      const { data: createdOrganization, error: organizationError } = await sb
        .from("organizations")
        .insert({ clerk_org_id: payload.org_id, name: payload.org_id })
        .select("id,clerk_org_id,name")
        .single();
      if (organizationError?.code === "23505") {
        const { data: racedOrganization, error: racedError } = await sb
          .from("organizations")
          .select("id,clerk_org_id,name")
          .eq("clerk_org_id", payload.org_id)
          .single();
        if (racedError || !racedOrganization) {
          throw new Error(`organization sync race failed: ${racedError?.message}`);
        }
        organization = racedOrganization;
      } else if (organizationError || !createdOrganization) {
        throw new Error(
          `organization sync failed: ${organizationError?.message ?? "missing organization"}`,
        );
      } else {
        organization = createdOrganization;
      }
    }

    const claimedRole = workspaceRole(payload.org_role);
    const { data: existingMembership } = await sb
      .from("memberships")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    const role =
      existingMembership?.role === "owner" ? "owner" : claimedRole;
    const { data: membership, error: membershipError } = await sb
      .from("memberships")
      .upsert(
        {
          organization_id: organization.id,
          profile_id: profile.id,
          role,
        },
        { onConflict: "organization_id,profile_id" },
      )
      .select("id,organization_id,profile_id,role")
      .single();
    if (membershipError || !membership) {
      throw new Error(
        `membership sync failed: ${membershipError?.message ?? "missing membership"}`,
      );
    }

    const { data: organizationSubscription } = await sb
      .from("subscriptions")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (organizationSubscription) {
      subscription = organizationSubscription as Subscription;
    }
    req.organization = organization as Organization;
    req.membership = membership as Membership;
  }

  req.auth = {
    clerkUserId,
    sessionId: payload.sid,
    email,
    fullName,
    avatarUrl,
    clerkOrganizationId: payload.org_id ?? null,
    organizationRole: payload.org_role ?? null,
  };
  req.profile = profile;
  req.subscription = subscription;
}

/** Personal workspaces are owner-equivalent; active organizations enforce role claims. */
export function requireWorkspaceRole(
  req: FastifyRequest,
  allowed: WorkspaceRole[],
): void {
  if (!req.organization) return;
  const role = req.membership?.role;
  if (!role || !allowed.includes(role)) {
    const error = new Error("Insufficient organization role");
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
}

export function workspaceScope(req: FastifyRequest): [string, string] {
  return req.organization
    ? ["organization_id", req.organization.id]
    : ["profile_id", req.profile!.id];
}
