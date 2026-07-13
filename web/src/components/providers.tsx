"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { SentryInit } from "@/components/analytics/sentry-init";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SentryInit />
      <PostHogProvider>
        <PostHogIdentify />
        {children}
      </PostHogProvider>
    </QueryClientProvider>
  );
}
