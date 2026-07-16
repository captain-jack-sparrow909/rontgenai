"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButtons({
  size = "default",
}: {
  size?: "default" | "sm" | "lg";
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <UserButton />;
  }

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
