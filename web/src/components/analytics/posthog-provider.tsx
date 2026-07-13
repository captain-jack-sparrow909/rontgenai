"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

/**
 * Browser SDK requires a **Project API Key** (`phc_…`).
 * Personal API keys (`phx_…`) are for server/management APIs only and cause:
 *   "API key is not valid: personal_api_key"
 */
function isProjectApiKey(key: string): boolean {
  return key.startsWith("phc_");
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://us.i.posthog.com";

    if (!key || typeof window === "undefined") return;

    if (!isProjectApiKey(key)) {
      console.warn(
        "[PostHog] NEXT_PUBLIC_POSTHOG_KEY must be a Project API Key (phc_…), not a personal key (phx_…). " +
          "Get it from PostHog → Project settings → Project API Key. Analytics disabled until fixed.",
      );
      return;
    }

    if ((posthog as { __loaded?: boolean }).__loaded) return;

    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || !isProjectApiKey(key)) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
