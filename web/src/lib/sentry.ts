/**
 * Lightweight Sentry bootstrap. Full @sentry/nextjs wizard can replace this later.
 * Safe no-op when DSN is missing.
 */

export function initBrowserSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;

  // Dynamic import keeps first load light when DSN unset
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV,
      });
    })
    .catch(() => {
      /* optional dependency path */
    });
}
