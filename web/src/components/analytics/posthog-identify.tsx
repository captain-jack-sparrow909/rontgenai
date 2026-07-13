"use client";

import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect } from "react";

/** Identify signed-in users in PostHog (no-op if SDK not loaded / wrong key). */
export function PostHogIdentify() {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!key?.startsWith("phc_")) return;

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else {
      posthog.reset();
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
