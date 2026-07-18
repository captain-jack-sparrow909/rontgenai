import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./env.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { waitlistRoutes } from "./routes/waitlist.js";
import { usageRoutes } from "./routes/usage.js";
import { billingRoutes } from "./routes/billing.js";
import { jobRoutes } from "./routes/jobs.js";
import { blueprintRoutes } from "./routes/blueprint.js";
import { pulseRoutes } from "./routes/pulse.js";
import { atlasRoutes } from "./routes/atlas.js";
import { sentinelRoutes } from "./routes/sentinel.js";
import { forgeRoutes } from "./routes/forge.js";
import { radarRoutes } from "./routes/radar.js";
import { relayRoutes } from "./routes/relay.js";
import { uploadRoutes } from "./routes/uploads.js";
import { paddleWebhookRoutes } from "./routes/webhooks/paddle.js";
import { clerkWebhookRoutes } from "./routes/webhooks/clerk.js";
import { githubWebhookRoutes } from "./routes/webhooks/github.js";
import { captureException, initMonitoring } from "./lib/monitoring.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

async function main() {
  initMonitoring("api-gateway");
  const app = Fastify({
    logger: true,
    genReqId: (request) => {
      const supplied = request.headers["x-request-id"];
      return typeof supplied === "string" && /^[A-Za-z0-9._:-]{8,100}$/.test(supplied)
        ? supplied
        : randomUUID();
    },
    // Base64 diagrams can be large
    bodyLimit: 12 * 1024 * 1024,
  });

  // Preserve raw body for GitHub webhook signature verification
  app.addHook("preParsing", async (request, _reply, payload) => {
    if (!request.url.startsWith("/v1/webhooks/")) {
      return payload;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of payload) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks);
    request.rawBody = raw.toString("utf8");
    return Readable.from(raw);
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      // Also allow APP_URL exactly
      if (origin === env.APP_URL) return cb(null, true);
      // Localhost only outside production
      if (
        env.NODE_ENV !== "production" &&
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
  });

  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-Id", request.id);
  });
  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(waitlistRoutes);
  await app.register(usageRoutes);
  await app.register(billingRoutes);
  await app.register(jobRoutes);
  await app.register(blueprintRoutes);
  await app.register(pulseRoutes);
  await app.register(atlasRoutes);
  await app.register(sentinelRoutes);
  await app.register(forgeRoutes);
  await app.register(radarRoutes);
  await app.register(relayRoutes);
  await app.register(uploadRoutes);
  await app.register(paddleWebhookRoutes);
  await app.register(clerkWebhookRoutes);
  await app.register(githubWebhookRoutes);

  app.setErrorHandler((err, req, reply) => {
    const error = err as Error & { statusCode?: number };
    const status = error.statusCode ?? 500;
    req.log.error({ err: error, requestId: req.id }, "request failed");
    if (status >= 500) {
      captureException(error, {
        requestId: req.id,
        method: req.method,
        url: req.url,
        clerkUserId: req.auth?.clerkUserId,
      });
    }
    reply.status(status).send({
      error:
        status >= 500 && env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message || "Internal Server Error",
      requestId: req.id,
    });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`api-gateway listening on :${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
