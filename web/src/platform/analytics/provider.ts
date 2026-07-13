/**
 * Vendor-swappable product analytics.
 * v1: PostHog · later: Mixpanel / Amplitude.
 */
export interface AnalyticsProvider {
  readonly name: string;
  capture(
    event: string,
    properties?: Record<string, unknown>,
    distinctId?: string,
  ): void;
}

export class NoopAnalytics implements AnalyticsProvider {
  readonly name = "noop";
  capture(): void {
    /* no-op */
  }
}

export class PostHogServerAnalytics implements AnalyticsProvider {
  readonly name = "posthog";

  constructor(private readonly key = process.env.NEXT_PUBLIC_POSTHOG_KEY) {}

  capture(
    event: string,
    properties?: Record<string, unknown>,
    distinctId?: string,
  ): void {
    if (!this.key) return;
    // Client-side PostHog is primary in Phase 0; server capture in Phase 1.
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics:posthog]", { event, properties, distinctId });
    }
  }
}

export function getAnalytics(): AnalyticsProvider {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return new PostHogServerAnalytics();
  }
  return new NoopAnalytics();
}
