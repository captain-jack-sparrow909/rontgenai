"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Zap } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { availableProducts, comingSoonProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

const productLabels: Record<string, string> = {
  blueprint: "Blueprint",
  pulse: "Pulse",
  atlas: "Atlas",
  sentinel: "Sentinel",
  forge: "Forge",
  radar: "Radar",
};

export default function DashboardPage() {
  const { data: me, isLoading, isError, error } = useMe();
  const plan = me?.subscription.plan ?? "free";
  const name = me?.profile.fullName?.split(" ")[0] || me?.profile.email;

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-[90px]" />
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">
          <Sparkles className="h-3 w-3 text-cyan-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Command center
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {name ? (
                <>
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    {name}
                  </span>
                </>
              ) : (
                "Welcome to Röntgen AI"
              )}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/50">
              Six AI tools for architecture, data, code, and incidents — one
              account, shared usage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize">{isLoading ? "…" : plan}</Badge>
            {plan === "free" ? (
              <Button asChild size="sm">
                <Link href="/app/billing">Upgrade</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href="/app/billing">Billing</Link>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {isError ? (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          {error instanceof Error
            ? error.message
            : "Could not reach API"}{" "}
          — start{" "}
          <code className="text-amber-100">api-gateway</code> on port 8000 for
          usage &amp; products.
        </div>
      ) : null}

      {/* Quick launch */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground/70">
            Launch workspace
          </h2>
          <Badge variant="success">6 live</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableProducts.map((p, i) => {
            const usage = me?.usage?.[p.slug];
            return (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <Link href={p.href} className="group block h-full">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-xl shadow-black/20 transition duration-300 hover:border-white/20 hover:from-white/[0.09]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="mb-4 flex items-start justify-between">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-slate-950 shadow-lg transition group-hover:scale-105",
                          p.accent,
                        )}
                      >
                        <ProductIcon name={p.icon} className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-foreground/25 transition group-hover:text-cyan-300" />
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/45">
                      {p.tagline}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-foreground/35">Open →</span>
                      {usage ? (
                        <span className="font-mono text-foreground/40">
                          {usage.used}/
                          {usage.limit < 0
                            ? "∞"
                            : usage.limit === 0
                              ? "—"
                              : usage.limit}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Usage */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground/70">
            Usage this month
          </h2>
          <Link
            href="/app/billing"
            className="text-xs text-cyan-400 hover:underline"
          >
            Manage plan
          </Link>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.keys(productLabels).map((key) => {
              const row = me?.usage?.[key];
              const limit = row?.limit;
              const used = row?.used ?? 0;
              const pct =
                limit && limit > 0
                  ? Math.min(100, (used / limit) * 100)
                  : 0;
              const limitLabel =
                limit === undefined
                  ? "—"
                  : limit < 0
                    ? "∞"
                    : limit === 0
                      ? "Pro+"
                      : String(limit);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-white/6 bg-black/20 px-3 py-3"
                >
                  <p className="text-[11px] text-foreground/45">
                    {productLabels[key]}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {isLoading ? "…" : `${used}`}
                    <span className="font-normal text-foreground/35">
                      {" "}
                      / {limitLabel}
                    </span>
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground/70">
            On the roadmap
          </h2>
          <Badge variant="muted">waitlist</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoonProducts.map((p) => (
            <div
              key={p.slug}
              className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 opacity-80"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-slate-950 opacity-70",
                    p.accent,
                  )}
                >
                  <ProductIcon name={p.icon} className="h-4 w-4" />
                </span>
                <Badge variant="muted">Soon</Badge>
              </div>
              <p className="font-medium text-white/90">{p.name}</p>
              <p className="mt-1 text-xs text-foreground/40">{p.tagline}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-foreground/35">
          <Link href="/#waitlist" className="text-cyan-400/80 hover:underline">
            Join the waitlist
          </Link>{" "}
          for Orbit, Aegis, Echo &amp; Arena
        </p>
      </section>

      {/* Tip */}
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-3">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <p className="text-xs leading-relaxed text-foreground/55">
          <strong className="text-foreground/80">Tip:</strong> Sentinel &amp;
          Forge need a Pro plan and{" "}
          <code className="text-cyan-300/80">GITHUB_TOKEN</code> (or GitHub
          App) on the API. Blueprint, Pulse, Atlas, and Radar work on Free with
          DeepSeek configured.
        </p>
      </div>
    </div>
  );
}
