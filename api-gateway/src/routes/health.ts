import type { FastifyPluginAsync } from "fastify";

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
};
