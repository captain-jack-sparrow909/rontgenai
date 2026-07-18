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
  "relay",
];

function startOfMonthUtc(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0),
  ).toISOString();
}

async function usageUnitsFromDatabase(
  profileId: string,
  organizationId: string | null,
  product: ProductId,
): Promise<number> {
  const { data, error } = await getSupabase().rpc("get_usage_units", {
    p_profile_id: profileId,
    p_organization_id: organizationId,
    p_product: product,
    p_period_start: startOfMonthUtc(),
  });
  if (error) throw new Error(`usage query failed: ${error.message}`);
  return Number(data ?? 0);
}

export async function getUsageForProfile(
  profileId: string,
  clerkUserId: string,
  plan: PlanId,
  organizationId: string | null = null,
): Promise<UsageSnapshot> {
  const limits = PLAN_LIMITS[plan];
  const redis = getRedis();
  const snapshot = {} as UsageSnapshot;

  for (const product of PRODUCTS) {
    let used = 0;
    if (redis) {
      try {
      const key = usagePeriodKey(organizationId ?? clerkUserId, product);
        const val = await redis.get<number | string>(key);
        if (val !== null) {
          used = Number(val);
        } else {
          used = await usageUnitsFromDatabase(profileId, organizationId, product);
          await redis.set(key, used, { ex: 60 * 60 * 24 * 40 });
        }
      } catch (error) {
        console.warn("usage cache unavailable; using database", error);
        used = await usageUnitsFromDatabase(profileId, organizationId, product);
      }
    } else {
      used = await usageUnitsFromDatabase(profileId, organizationId, product);
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
  organizationId?: string | null;
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

  const sb = getSupabase();
  const { data, error } = await sb.rpc("record_usage_if_allowed", {
    p_profile_id: opts.profileId,
    p_organization_id: opts.organizationId ?? null,
    p_product: opts.product,
    p_units: units,
    p_limit: isUnlimited(limit) ? -1 : limit,
    p_metadata: opts.metadata ?? {},
  });
  if (error) {
    throw new Error(`usage charge failed: ${error.message}`);
  }
  const charge = (data as Array<{ allowed: boolean; used: number }> | null)?.[0];
  if (!charge) throw new Error("usage charge returned no result");

  const redis = getRedis();
  if (redis) {
    const key = usagePeriodKey(opts.organizationId ?? opts.clerkUserId, opts.product);
    try {
      await redis.set(key, charge.used, { ex: 60 * 60 * 24 * 40 });
    } catch (cacheError) {
      console.warn("usage charged but cache update failed", cacheError);
    }
  }

  return {
    allowed: charge.allowed,
    used: charge.used,
    limit,
    remaining: isUnlimited(limit) ? null : Math.max(0, limit - charge.used),
  };
}
