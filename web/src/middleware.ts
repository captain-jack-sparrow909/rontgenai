import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

/**
 * Clerk v7 auto-enables frontendApiProxy only on `*.vercel.app` hosts, but
 * build-time still injects `proxyUrl: "/__clerk"` when
 * VERCEL_PROJECT_PRODUCTION_URL is a vercel.app hostname. On our custom
 * domain (www.rontgenai.dev) the middleware never proxied `/__clerk/*`, so
 * clerk-js 404'd and auth UI never hydrated.
 *
 * Explicitly enable the proxy on every host so `/__clerk` works in production.
 */
export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    frontendApiProxy: {
      enabled: true,
    },
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk frontend API proxy (must match .js assets under /__clerk)
    "/__clerk/(.*)",
  ],
};
