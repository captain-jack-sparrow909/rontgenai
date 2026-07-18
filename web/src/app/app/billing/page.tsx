"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check, Sparkles, Users, Zap } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { createCheckout } from "@/lib/api";
import { openPaddleCheckout } from "@/lib/paddle";
import { plans } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const BL_STYLES = `
@property --bl-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@keyframes bl-spin { to { --bl-angle: 360deg; } }
.bl-pro-ring {
  background: conic-gradient(
    from var(--bl-angle),
    rgba(34,211,238,0)    0%,
    rgba(34,211,238,0.65) 18%,
    rgba(99,102,241,0.45) 38%,
    rgba(34,211,238,0)    56%
  );
  animation: bl-spin 4s linear infinite;
  border-radius: 1.25rem;
  padding: 1px;
}
`;

const PLAN_ACCENT: Record<string, { rgb: string; color: string }> = {
  free: { rgb: "100,116,139", color: "#64748b" },
  pro:  { rgb: "34,211,238",  color: "#22d3ee" },
  team: { rgb: "167,139,250", color: "#a78bfa" },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Sparkles className="h-3.5 w-3.5" />,
  pro:  <Zap       className="h-3.5 w-3.5" />,
  team: <Users     className="h-3.5 w-3.5" />,
};

function BillingInner() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const { data: me, isLoading, refetch } = useMe();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const currentPlan = me?.subscription.plan ?? "free";

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      setToast({ text: "Payment received. Refreshing plan…", ok: true });
      void refetch();
    } else if (status === "cancel") {
      setToast({ text: "Checkout canceled.", ok: false });
    }
  }, [searchParams, refetch]);

  async function onUpgrade(plan: "pro" | "team") {
    setBusy(plan);
    setToast(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      const checkout = await createCheckout(token, plan, billingInterval);
      const result = await openPaddleCheckout({
        priceId: checkout.priceId,
        email: checkout.customer?.email ?? me?.profile.email,
        customData: checkout.customData,
        successUrl: checkout.successUrl,
      });
      if (!result.opened) {
        setToast({ text: result.reason ?? "Could not open Paddle checkout", ok: false });
      } else {
        setToast({ text: `Opening ${plan} (${billingInterval}ly) checkout…`, ok: true });
      }
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "Checkout failed", ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <style>{BL_STYLES}</style>

      {/* ── Background decoration ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <svg
          className="absolute -right-24 -top-24 h-[480px] w-[480px] opacity-[0.022]"
          viewBox="0 0 480 480" fill="none"
        >
          {[40, 80, 120, 160, 200, 230].map((r, i) => (
            <circle key={r} cx="240" cy="240" r={r} stroke="#22d3ee"
              strokeWidth={i === 2 ? 1.5 : 0.8} />
          ))}
          <line x1="240" y1="10" x2="240" y2="470" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.6" />
          <line x1="10"  y1="240" x2="470" y2="240" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.6" />
          <line x1="70"  y1="70"  x2="410" y2="410" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.4" />
          <line x1="410" y1="70"  x2="70"  y2="410" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.4" />
          <circle cx="240" cy="240" r="6"  stroke="#22d3ee" strokeWidth="1.2" />
          <circle cx="240" cy="240" r="2"  fill="#22d3ee" />
        </svg>
        <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-violet-500/[0.06] blur-[110px]" />
        <div className="absolute right-1/3 top-0 h-56 w-56 rounded-full bg-cyan-500/[0.07] blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">

        {/* ── Hero ── */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Billing Console
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Subscription
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              Control
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/40">
            One suite subscription · all seven live products · payments via Paddle
          </p>

          {/* Live plan status */}
          {!isLoading && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] text-foreground/40">Active plan</span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                {currentPlan}
              </span>
            </div>
          )}
        </div>

        {/* ── Interval toggle ── */}
        <div className="mb-8">
          <div className="inline-flex items-center rounded-xl border border-white/[0.07] bg-black/50 p-1 backdrop-blur-sm">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBillingInterval(i)}
                className={cn(
                  "relative rounded-lg px-5 py-2 text-xs font-semibold transition-all duration-200",
                  billingInterval === i
                    ? "text-white"
                    : "text-foreground/32 hover:text-foreground/65",
                )}
              >
                {billingInterval === i && (
                  <span className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-inset ring-white/[0.1]" />
                )}
                <span className="relative flex items-center gap-2">
                  {i === "month" ? "Monthly" : (
                    <>
                      Yearly
                      <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                        −2 mo
                      </span>
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Plan cards ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const price =
              billingInterval === "year" && plan.priceYearly > 0
                ? Math.round(plan.priceYearly / 12)
                : plan.priceMonthly;
            const isCurrent = currentPlan === plan.id;
            const isPro = plan.id === "pro";
            const accent = PLAN_ACCENT[plan.id] ?? PLAN_ACCENT.pro;

            const CardInner = (
              <div
                className={cn(
                  "relative flex h-full flex-col p-6",
                  isPro
                    ? "rounded-[calc(1.25rem_-_1px)] bg-[#04060c]"
                    : "rounded-2xl",
                  plan.id === "free" && "border border-white/[0.07] bg-[#05070d]",
                  plan.id === "team" && "border border-violet-400/[0.18] bg-[#060410]",
                )}
              >
                {/* Top gradient line */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
                  style={{ background: `linear-gradient(to right,transparent,rgba(${accent.rgb},0.7),transparent)` }}
                />

                {/* Ambient radial glow */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-2xl"
                  style={{ background: `radial-gradient(ellipse at 50% 0%,rgba(${accent.rgb},0.18),transparent 70%)` }}
                />

                <div className="relative flex flex-1 flex-col">
                  {/* Plan header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{
                          background: `rgba(${accent.rgb},0.1)`,
                          color: accent.color,
                          border: `1px solid rgba(${accent.rgb},0.22)`,
                        }}
                      >
                        {PLAN_ICONS[plan.id]}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.22em]"
                        style={{ color: accent.color }}
                      >
                        {plan.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          background: `rgba(${accent.rgb},0.12)`,
                          color: accent.color,
                          border: `1px solid rgba(${accent.rgb},0.22)`,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-5">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
                        ${price}
                      </span>
                      <span className="mb-1 text-sm text-foreground/30">/mo</span>
                    </div>
                    {billingInterval === "year" && plan.priceYearly > 0 && (
                      <p className="mt-0.5 text-[11px] text-foreground/28">${plan.priceYearly} billed yearly</p>
                    )}
                    {plan.priceMonthly === 0 && (
                      <p className="mt-0.5 text-[11px] text-foreground/28">Forever free</p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs leading-relaxed text-foreground/40">{plan.description}</p>

                  {/* Divider */}
                  <div
                    className="my-4 h-px"
                    style={{ background: `linear-gradient(to right,rgba(${accent.rgb},0.18),transparent)` }}
                  />

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground/55">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: accent.color }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Limits mini-grid */}
                  <div
                    className="mt-5 rounded-xl p-3"
                    style={{
                      background: `rgba(${accent.rgb},0.04)`,
                      border: `1px solid rgba(${accent.rgb},0.09)`,
                    }}
                  >
                    <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
                      Limits
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {Object.entries(plan.limits).map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[9px] uppercase tracking-wide text-foreground/22">{k}</p>
                          <p className="text-[10px] font-medium text-foreground/50">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="relative mt-5">
                  {plan.id === "free" ? (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-default rounded-xl py-2.5 text-xs font-semibold text-foreground/28 ring-1 ring-inset ring-white/[0.06]"
                    >
                      {isCurrent ? "Current plan" : "Always included"}
                    </button>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-default rounded-xl py-2.5 text-xs font-semibold text-foreground/28 ring-1 ring-inset ring-white/[0.06]"
                    >
                      Active plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        if (plan.id === "pro" || plan.id === "team") void onUpgrade(plan.id);
                      }}
                      className="w-full rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 disabled:opacity-60"
                      style={{
                        background: `linear-gradient(135deg,rgba(${accent.rgb},0.9),rgba(${accent.rgb},0.55))`,
                        color: "#04060c",
                        boxShadow: `0 0 24px rgba(${accent.rgb},0.18)`,
                      }}
                    >
                      {busy === plan.id ? "Opening…" : plan.cta}
                    </button>
                  )}
                </div>
              </div>
            );

            return (
              <div key={plan.id} className="relative flex flex-col">
                {plan.highlighted && !isCurrent && (
                  <div
                    className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                    style={{
                      background: "rgba(34,211,238,0.12)",
                      color: "#22d3ee",
                      border: "1px solid rgba(34,211,238,0.28)",
                    }}
                  >
                    Most popular
                  </div>
                )}
                {isPro ? (
                  <div className="bl-pro-ring flex flex-1 flex-col">{CardInner}</div>
                ) : (
                  CardInner
                )}
              </div>
            );
          })}
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div
            className={cn(
              "mt-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs",
              toast.ok
                ? "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-100/80"
                : "border-red-400/20 bg-red-400/[0.06] text-red-100/80",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                toast.ok ? "bg-cyan-400" : "bg-red-400",
              )}
            />
            {toast.text}
          </div>
        )}

        {/* ── Footer ── */}
        <p className="mt-10 text-center text-[11px] text-foreground/22">
          <Link href="/#pricing" className="transition hover:text-foreground/50">
            Full pricing details
          </Link>
          {" · "}
          Taxes collected by Paddle (Merchant of Record)
          {" · "}
          <Link href="/app/settings" className="transition hover:text-foreground/50">
            Settings
          </Link>
        </p>
      </div>
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-foreground/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Loading billing…
        </div>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
