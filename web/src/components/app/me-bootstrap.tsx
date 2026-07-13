"use client";

/**
 * Prefetches /v1/me on app shell mount so profile is synced to Supabase
 * as soon as the user opens the dashboard (Clerk JWT → gateway).
 */
import { useMe } from "@/hooks/use-me";

export function MeBootstrap() {
  useMe();
  return null;
}
