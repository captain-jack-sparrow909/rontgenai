import type { FastifyPluginAsync } from "fastify";
import { env } from "../env.js";
import { hasValidKeepaliveAuthorization } from "../lib/keepalive.js";
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

  app.route({
    method: ["GET", "POST"],
    url: "/v1/keepalive",
    handler: async (request, reply) => {
      reply
        .header("Cache-Control", "no-store, max-age=0")
        .header("Pragma", "no-cache")
        .header("Expires", "0");

      if (!env.KEEPALIVE_CRON_SECRET) {
        request.log.error("keepalive endpoint called without KEEPALIVE_CRON_SECRET");
        return reply.status(503).send({
          ok: false,
          error: "Keepalive endpoint is not configured",
          requestId: request.id,
        });
      }

      if (
        !hasValidKeepaliveAuthorization(
          request.headers.authorization,
          env.KEEPALIVE_CRON_SECRET,
        )
      ) {
        return reply.status(401).send({
          ok: false,
          error: "Unauthorized",
          requestId: request.id,
        });
      }

      const startedAt = Date.now();
      const { data, error } = await getSupabase().rpc("toggle_keepalive_pulse");
      if (error) {
        request.log.error(
          { err: error, requestId: request.id },
          "database keepalive failed",
        );
        return reply.status(503).send({
          ok: false,
          error: "Database keepalive failed",
          requestId: request.id,
        });
      }

      const result = Array.isArray(data) ? data[0] : data;
      const action = result?.action;
      if (action !== "inserted" && action !== "deleted") {
        request.log.error(
          { result, requestId: request.id },
          "database keepalive returned an invalid result",
        );
        return reply.status(503).send({
          ok: false,
          error: "Database keepalive returned an invalid result",
          requestId: request.id,
        });
      }

      return reply.send({
        ok: true,
        service: "api-gateway",
        database: { action },
        latencyMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
      });
    },
  });

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
