import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { env } from "../env.js";
import { getRedis } from "../lib/redis.js";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type Counter = { count: number; resetAt: number };

export class FixedWindowMemoryLimiter {
  private readonly counters = new Map<string, Counter>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision {
    const existing = this.counters.get(key);
    const counter = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;
    counter.count += 1;
    this.counters.set(key, counter);

    if (this.counters.size > 10_000) {
      for (const [candidate, value] of this.counters) {
        if (value.resetAt <= now) this.counters.delete(candidate);
      }
    }

    return {
      allowed: counter.count <= limit,
      limit,
      remaining: Math.max(0, limit - counter.count),
      resetAt: counter.resetAt,
    };
  }
}

const memoryLimiter = new FixedWindowMemoryLimiter();

function subject(request: FastifyRequest): string {
  return `ip:${request.ip}`;
}

async function consume(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitDecision> {
  const redis = getRedis();
  if (!redis) {
    return memoryLimiter.consume(key, limit, windowSeconds * 1000);
  }
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    const ttl = await redis.ttl(key);
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + Math.max(1, ttl) * 1000,
    };
  } catch (error) {
    console.warn("rate limit Redis unavailable; using process-local fallback", error);
    return memoryLimiter.consume(key, limit, windowSeconds * 1000);
  }
}

export const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    if (
      request.url === "/health" ||
      request.url === "/ready" ||
      request.url === "/v1/health" ||
      request.url === "/v1/keepalive" ||
      request.url.startsWith("/v1/webhooks/")
    ) {
      return;
    }

    const writes = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const limit = writes
      ? env.RATE_LIMIT_WRITE_PER_MINUTE
      : env.RATE_LIMIT_READ_PER_MINUTE;
    const bucket = writes ? "write" : "read";
    const minute = Math.floor(Date.now() / 60_000);
    const decision = await consume(
      `rate:${bucket}:${subject(request)}:${minute}`,
      limit,
      60,
    );

    reply.header("RateLimit-Limit", decision.limit);
    reply.header("RateLimit-Remaining", decision.remaining);
    reply.header("RateLimit-Reset", Math.ceil(decision.resetAt / 1000));
    if (!decision.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((decision.resetAt - Date.now()) / 1000),
      );
      return reply
        .header("Retry-After", retryAfter)
        .status(429)
        .send({
          error: "Too many requests",
          requestId: request.id,
          retryAfter,
        });
    }
  });
};
