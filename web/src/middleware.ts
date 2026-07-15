import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

/**
 * Clerk v7 auto-enables frontendApiProxy only on `*.vercel.app` hosts, but
 * build-time still injects `proxyUrl: "/__clerk"` when
 * VERCEL_PROJECT_PRODUCTION_URL is a vercel.app hostname. On our custom
 * domain (www.rontgenai.dev) the middleware never proxied `/__clerk/*`, so
 * clerk-js 404'd and auth UI never hydrated.
 *
 * Keep the proxy enabled for deployed hosts, but let local development talk to
 * Clerk directly. Proxying a refresh handshake through localhost makes Clerk
 * attribute the request to localhost and reject it with `host_invalid`.
 */
export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    frontendApiProxy: {
      enabled: (url) => {
        const hostname = url.hostname.toLowerCase();
        const isLocalhost =
          hostname === "localhost" ||
          hostname.endsWith(".localhost") ||
          hostname === "127.0.0.1" ||
          hostname === "0.0.0.0" ||
          hostname === "[::1]" ||
          hostname === "::1";

        return !isLocalhost;
      },
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
