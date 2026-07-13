import { Redis } from "@upstash/redis";
import { env } from "../env.js";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

/** Usage period key: user + product + YYYY-MM */
export function usagePeriodKey(
  clerkUserId: string,
  product: string,
  date = new Date(),
): string {
  const ym = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `usage:${clerkUserId}:${product}:${ym}`;
}
