"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";
import { createCheckout } from "@/lib/api";
import { openPaddleCheckout } from "@/lib/paddle";
import { plans } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function BillingInner() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const { data: me, isLoading, refetch } = useMe();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");

  const currentPlan = me?.subscription.plan ?? "free";

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      setMessage("Payment received (or pending). Refreshing plan…");
      void refetch();
    } else if (status === "cancel") {
      setMessage("Checkout canceled.");
    }
  }, [searchParams, refetch]);

  async function onUpgrade(plan: "pro" | "team") {
    setBusy(plan);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");

      const checkout = await createCheckout(token, plan, interval);
      const result = await openPaddleCheckout({
        priceId: checkout.priceId,
        email: checkout.customer?.email ?? me?.profile.email,
        customData: checkout.customData,
        successUrl: checkout.successUrl,
      });

      if (!result.opened) {
        setMessage(result.reason ?? "Could not open Paddle checkout");
      } else {
        setMessage(`Opening ${plan} (${interval}ly) checkout…`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-foreground/55">
          Suite subscription via Paddle. Free/Pro are personal; Team uses Clerk
          Organizations for shared seats.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground/50">Billing interval</span>
        <div className="inline-flex rounded-lg border border-white/10 p-0.5">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition",
                interval === i
                  ? "bg-white/10 text-white"
                  : "text-foreground/50 hover:text-white",
              )}
            >
              {i === "month" ? "Monthly" : "Yearly (−2 mo)"}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge className="capitalize">
              {isLoading ? "…" : currentPlan}
            </Badge>
          </div>
          <CardDescription>
            Status: {me?.subscription.status ?? "—"} · Provider:{" "}
            {me?.subscription.provider ?? "paddle"}
            {me?.subscription.currentPeriodEnd
              ? ` · Renews ${new Date(me.subscription.currentPeriodEnd).toLocaleDateString()}`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.map((plan) => {
            const price =
              interval === "year" && plan.priceYearly > 0
                ? Math.round(plan.priceYearly / 12)
                : plan.priceMonthly;
            return (
              <div
                key={plan.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {plan.name}{" "}
                    <span className="text-foreground/50">
                      · ${price}/mo
                      {interval === "year" && plan.priceYearly > 0
                        ? ` ($${plan.priceYearly}/yr)`
                        : ""}
                    </span>
                  </p>
                  <p className="text-sm text-foreground/50">
                    {plan.description}
                  </p>
                </div>
                {plan.id === "free" ? (
                  <Button variant="secondary" disabled>
                    {currentPlan === "free" ? "Current" : "Included"}
                  </Button>
                ) : (
                  <Button
                    variant={plan.highlighted ? "default" : "secondary"}
                    disabled={busy !== null || currentPlan === plan.id}
                    onClick={() => {
                      if (plan.id === "pro" || plan.id === "team") {
                        void onUpgrade(plan.id);
                      }
                    }}
                  >
                    {currentPlan === plan.id
                      ? "Current"
                      : busy === plan.id
                        ? "Opening…"
                        : plan.cta}
                  </Button>
                )}
              </div>
            );
          })}
          {message ? (
            <p className="text-sm text-cyan-300/90">{message}</p>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/#pricing">View full pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-foreground/50">Loading billing…</div>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
