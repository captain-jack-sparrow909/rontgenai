import * as Sentry from "@sentry/node";
import { env } from "../env.js";

let initialized = false;

export function initMonitoring(service: "api-gateway" | "worker"): void {
  if (initialized || !env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA,
    serverName: service,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
    sendDefaultPii: false,
  });
  Sentry.setTag("service", service);
  initialized = true;
}

export function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): string | null {
  if (!initialized) return null;
  return Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) scope.setExtra(key, value);
    }
    return Sentry.captureException(error);
  });
}

export async function flushMonitoring(timeoutMs = 2000): Promise<boolean> {
  return initialized ? Sentry.flush(timeoutMs) : true;
}
