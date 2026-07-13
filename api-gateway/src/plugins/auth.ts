import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "../env.js";
import { ensureProfile } from "../lib/profiles.js";
import type { Profile, Subscription } from "../lib/supabase.js";

export type AuthUser = {
  clerkUserId: string;
  sessionId?: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
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
};

/** Require valid Clerk session JWT and ensure Supabase profile exists. */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  const token = await extractBearer(req);
  if (!token) {
    const err = new Error("Missing Authorization bearer token");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  let payload: { sub: string; sid?: string };
  try {
    payload = (await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    })) as { sub: string; sid?: string };
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

  const { profile, subscription } = await ensureProfile({
    clerkUserId,
    email,
    fullName,
    avatarUrl,
  });

  req.auth = {
    clerkUserId,
    sessionId: payload.sid,
    email,
    fullName,
    avatarUrl,
  };
  req.profile = profile;
  req.subscription = subscription;
}
