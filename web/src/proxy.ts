import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

/**
 * Clerk's production publishable key points at the verified
 * clerk.rontgenai.dev CNAME, so browser handshakes must go there directly.
 * Enabling frontendApiProxy would instead derive /__clerk from the request
 * host (www.rontgenai.dev), which Clerk rejects unless that exact proxy URL is
 * separately registered in the Clerk Dashboard.
 */
export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
