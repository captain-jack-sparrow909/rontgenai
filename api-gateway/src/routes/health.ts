import type { FastifyPluginAsync } from "fastify";
import { env } from "../env.js";
import { getRedis } from "../lib/redis.js";
import { getSupabase } from "../lib/supabase.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    ok: true,
    service: "api-gateway",
    ts: new Date().toISOString(),
  }));

  app.get("/v1/health", async () => ({
    ok: true,
    service: "api-gateway",
    version: "1",
    ts: new Date().toISOString(),
  }));

  app.get("/ready", async (_request, reply) => {
    const startedAt = Date.now();
    const { error: databaseError } = await getSupabase()
      .from("schema_migrations")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    let redis: "ok" | "disabled" | "error" = "disabled";
    const redisClient = getRedis();
    if (redisClient) {
      try {
        await redisClient.ping();
        redis = "ok";
      } catch {
        redis = "error";
      }
    }

    const ready = !databaseError && redis !== "error";
    return reply.status(ready ? 200 : 503).send({
      ok: ready,
      service: "api-gateway",
      checks: {
        database: databaseError ? "error" : "ok",
        redis,
        jobExecution: env.JOB_EXECUTION_MODE,
      },
      latencyMs: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  });
};
