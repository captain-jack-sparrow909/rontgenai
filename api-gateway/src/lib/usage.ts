import {
  PLAN_LIMITS,
  type PlanId,
  type ProductId,
  isUnlimited,
} from "./plans.js";
import { getRedis, usagePeriodKey } from "./redis.js";
import { getSupabase } from "./supabase.js";

export type UsageSnapshot = Record<
  ProductId,
  { used: number; limit: number; remaining: number | null }
>;

const PRODUCTS: ProductId[] = [
  "blueprint",
  "pulse",
  "atlas",
  "sentinel",
  "forge",
  "radar",
];

function startOfMonthUtc(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0),
  ).toISOString();
}

export async function getUsageForProfile(
  profileId: string,
  clerkUserId: string,
  plan: PlanId,
): Promise<UsageSnapshot> {
  const limits = PLAN_LIMITS[plan];
  const redis = getRedis();
  const snapshot = {} as UsageSnapshot;

  for (const product of PRODUCTS) {
    let used = 0;
    if (redis) {
      const key = usagePeriodKey(clerkUserId, product);
      const val = await redis.get<number | string>(key);
      used = Number(val ?? 0);
    } else {
      const sb = getSupabase();
      const { count, error } = await sb
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .eq("product", product)
        .gte("created_at", startOfMonthUtc());

      if (error) {
        throw new Error(`usage query failed: ${error.message}`);
      }
      used = count ?? 0;
    }

    const limit = limits[product];
    const remaining = isUnlimited(limit)
      ? null
      : Math.max(0, limit - used);

    snapshot[product] = { used, limit, remaining };
  }

  return snapshot;
}

export async function recordUsage(opts: {
  profileId: string;
  clerkUserId: string;
  product: ProductId;
  plan: PlanId;
  units?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ allowed: boolean; used: number; limit: number; remaining: number | null }> {
  const units = opts.units ?? 1;
  const limit = PLAN_LIMITS[opts.plan][opts.product];

  if (limit === 0) {
    return { allowed: false, used: 0, limit, remaining: 0 };
  }

  const current = await getUsageForProfile(
    opts.profileId,
    opts.clerkUserId,
    opts.plan,
  );
  const used = current[opts.product].used;

  if (!isUnlimited(limit) && used + units > limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  const sb = getSupabase();
  const { error } = await sb.from("usage_events").insert({
    profile_id: opts.profileId,
    product: opts.product,
    units,
    metadata: opts.metadata ?? {},
  });

  if (error) {
    throw new Error(`usage insert failed: ${error.message}`);
  }

  const redis = getRedis();
  let nextUsed = used + units;
  if (redis) {
    const key = usagePeriodKey(opts.clerkUserId, opts.product);
    nextUsed = await redis.incrby(key, units);
    // expire ~40 days
    await redis.expire(key, 60 * 60 * 24 * 40);
  }

  return {
    allowed: true,
    used: nextUsed,
    limit,
    remaining: isUnlimited(limit) ? null : Math.max(0, limit - nextUsed),
  };
}
