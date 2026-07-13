import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./env.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { waitlistRoutes } from "./routes/waitlist.js";
import { usageRoutes } from "./routes/usage.js";
import { billingRoutes } from "./routes/billing.js";
import { jobRoutes } from "./routes/jobs.js";
import { blueprintRoutes } from "./routes/blueprint.js";
import { pulseRoutes } from "./routes/pulse.js";
import { atlasRoutes } from "./routes/atlas.js";
import { paddleWebhookRoutes } from "./routes/webhooks/paddle.js";
import { clerkWebhookRoutes } from "./routes/webhooks/clerk.js";

async function main() {
  const app = Fastify({
    logger: true,
    // Base64 diagrams can be large
    bodyLimit: 12 * 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      // Allow localhost variants in development
      if (
        env.NODE_ENV !== "production" &&
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(waitlistRoutes);
  await app.register(usageRoutes);
  await app.register(billingRoutes);
  await app.register(jobRoutes);
  await app.register(blueprintRoutes);
  await app.register(pulseRoutes);
  await app.register(atlasRoutes);
  await app.register(paddleWebhookRoutes);
  await app.register(clerkWebhookRoutes);

  app.setErrorHandler((err, _req, reply) => {
    const error = err as Error & { statusCode?: number };
    const status = error.statusCode ?? 500;
    app.log.error(error);
    reply.status(status).send({
      error: error.message || "Internal Server Error",
    });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`api-gateway listening on :${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
