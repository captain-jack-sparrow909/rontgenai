import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

/**
 * Keep Clerk's frontend API proxy enabled for deployed hosts, while local
 * development talks to Clerk directly. Proxying a refresh handshake through
 * localhost makes Clerk attribute it to localhost and reject the host.
 */
export default clerkMiddleware(
  async (auth, request) => {
    if (isProtectedRoute(request)) await auth.protect();
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
