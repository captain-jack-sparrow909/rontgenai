"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="relative mx-auto max-w-3xl">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-[90px]" />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Billing
        </h1>
        <p className="mt-2 text-sm text-foreground/50">
          One suite subscription via Paddle. Free/Pro are personal; Team unlocks
          shared seats.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xs text-foreground/45">Interval</span>
        <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition",
                interval === i
                  ? "bg-white/10 text-white shadow"
                  : "text-foreground/45 hover:text-white",
              )}
            >
              {i === "month" ? "Monthly" : "Yearly (−2 mo)"}
            </button>
          ))}
        </div>
        <Badge className="ml-auto capitalize">
          Current: {isLoading ? "…" : currentPlan}
        </Badge>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const price =
            interval === "year" && plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.05] to-transparent p-5 transition",
                plan.highlighted
                  ? "border-cyan-400/30 shadow-lg shadow-cyan-500/5"
                  : "border-white/8",
                isCurrent && "ring-1 ring-cyan-400/20",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">
                      {plan.name}
                    </h2>
                    {plan.highlighted ? <Badge>Popular</Badge> : null}
                    {isCurrent ? (
                      <Badge variant="success">Current</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-foreground/50">
                    {plan.description}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                    ${price}
                    <span className="text-sm font-normal text-foreground/40">
                      /mo
                    </span>
                    {interval === "year" && plan.priceYearly > 0 ? (
                      <span className="ml-2 text-xs font-normal text-foreground/35">
                        ${plan.priceYearly}/yr
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 4).map((f) => (
                      <li
                        key={f}
                        className="flex gap-2 text-xs text-foreground/55"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0">
                  {plan.id === "free" ? (
                    <Button variant="secondary" disabled>
                      {isCurrent ? "Current plan" : "Included"}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlighted ? "default" : "secondary"}
                      disabled={busy !== null || isCurrent}
                      onClick={() => {
                        if (plan.id === "pro" || plan.id === "team") {
                          void onUpgrade(plan.id);
                        }
                      }}
                    >
                      {isCurrent
                        ? "Current"
                        : busy === plan.id
                          ? "Opening…"
                          : plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100/90">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-foreground/35">
        <Link href="/#pricing" className="text-cyan-400/80 hover:underline">
          Full pricing details
        </Link>
        {" · "}
        Taxes handled by Paddle (Merchant of Record)
      </p>
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
