"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Always render visible CTAs as hard links.
 *
 * Clerk modals / <Show> depend on clerk-js loading. If the FAPI proxy or
 * script fails, those components render nothing and the header looks empty.
 * Links to /sign-in and /sign-up always work.
 */
export function AuthButtons({
  size = "default",
}: {
  size?: "default" | "sm" | "lg";
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Button asChild variant="secondary" size={size}>
          <Link href="/app">Dashboard</Link>
        </Button>
        <UserButton />
      </div>
    );
  }

  // Loading, Clerk failed, or signed out — always show working links
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size={size}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size={size}>
        <Link href="/sign-up">Get started</Link>
      </Button>
    </div>
  );
}

export function HeroCta() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {isLoaded && isSignedIn ? (
        <Button asChild size="lg">
          <Link href="/app">Open dashboard</Link>
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link href="/sign-up">Start free</Link>
        </Button>
      )}
      <Button asChild variant="outline" size="lg">
        <Link href="#products">Explore products</Link>
      </Button>
    </div>
  );
}
