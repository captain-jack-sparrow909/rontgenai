"use client";

import { useEffect } from "react";
import { initBrowserSentry } from "@/lib/sentry";

export function SentryInit() {
  useEffect(() => {
    initBrowserSentry();
  }, []);
  return null;
}
