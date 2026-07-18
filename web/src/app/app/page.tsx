"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Crown,
  ChevronRight,
  Activity,
} from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { availableProducts, comingSoonProducts, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

type UsageRow = { used: number; limit: number } | undefined;

// ─── ProductLaunchCard ────────────────────────────────────────────────────────

function ProductLaunchCard({
  product,
  index,
  usage,
}: {
  product: Product;
  index: number;
  usage: UsageRow;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    setSpotlight({ x: nx * 100, y: ny * 100, opacity: 1 });
    setTilt({ x: (ny - 0.5) * -10, y: (nx - 0.5) * 13 });
  };

  const handleMouseLeave = () => {
    setSpotlight((s) => ({ ...s, opacity: 0 }));
    setTilt({ x: 0, y: 0 });
  };

  const used = usage?.used ?? 0;
  const limit = usage?.limit;
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const limitLabel =
    limit === undefined ? "—" : limit < 0 ? "∞" : limit === 0 ? "Pro+" : String(limit);

  const isMoving = tilt.x !== 0 || tilt.y !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.06 * index,
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={product.href} className="group block h-full">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a12]"
          style={{
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: isMoving
              ? "transform 0.12s ease-out"
              : "transform 0.65s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.3s ease, border-color 0.3s ease",
            boxShadow: isMoving
              ? "0 28px 56px -12px rgba(0,0,0,0.55)"
              : "0 0 0 0 transparent",
            borderColor: isMoving ? "rgba(255,255,255,0.14)" : undefined,
          }}
        >
          {/* Mouse spotlight */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(220px circle at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,0.055) 0%, transparent 70%)`,
              opacity: spotlight.opacity,
              transition: "opacity 0.2s ease",
            }}
          />

          {/* Top shimmer line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

          {/* Colored accent bar */}
          <div className={cn("h-[3px] w-full bg-gradient-to-r", product.accent)} />

          <div className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
                  product.accent,
                )}
              >
                <ProductIcon name={product.icon} className="h-5 w-5 text-slate-950" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-foreground/20 transition-all group-hover:border-cyan-400/30 group-hover:text-cyan-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>

            <h3
              className="text-[17px] font-semibold leading-tight text-white"
              style={{ fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif" }}
            >
              {product.name}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/45">
              {product.tagline}
            </p>

            {/* Usage bar */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-foreground/30">Usage</span>
                <span className="font-mono text-foreground/35">
                  {used}
                  <span className="text-foreground/20"> / {limitLabel}</span>
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    product.accent,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  delay,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  delay: number;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a12] px-4 py-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md",
            accent,
          )}
        >
          <Icon className="h-4 w-4 text-slate-950" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-foreground/40">{label}</p>
          <p className="text-sm font-semibold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-foreground/30">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Placeholder activity ────────────────────────────────────────────────────

const RECENT_ACTIVITY = [
  { product: "Blueprint", action: "Architecture reviewed", time: "2h ago", color: "from-cyan-400 to-blue-500" },
  { product: "Radar", action: "Incident RCA generated", time: "5h ago", color: "from-red-400 to-rose-600" },
  { product: "Atlas", action: "Repo map created", time: "Yesterday", color: "from-violet-400 to-purple-500" },
  { product: "Pulse", action: "Query session saved", time: "2d ago", color: "from-emerald-400 to-teal-500" },
];

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: me, isLoading, isError, error } = useMe();
  const plan = me?.subscription.plan ?? "free";
  const name = me?.profile.fullName?.split(" ")[0] || me?.profile.email;
  const totalUsed = me?.usage
    ? Object.values(me.usage).reduce(
        (acc: number, u: UsageRow) => acc + (u?.used ?? 0),
        0,
      )
    : 0;

  return (
    <div className="relative mx-auto max-w-6xl space-y-8">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
        <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-violet-600/[0.06] blur-[110px]" />
        <div className="absolute bottom-32 left-1/3 h-[300px] w-[300px] rounded-full bg-blue-600/[0.04] blur-[90px]" />
        <div className="blueprint-scanline absolute inset-0 opacity-[0.15]" />
      </div>

      {/* ── Hero greeting ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#0a0f1e] via-[#080c16] to-[#05070d] p-6 sm:p-8">
          {/* Top glow line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Decorative SVG — concentric target rings */}
          <svg
            className="pointer-events-none absolute right-0 top-0 h-56 w-56 opacity-[0.035]"
            viewBox="0 0 200 200"
            fill="none"
          >
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            {[90, 70, 50, 30].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} stroke="url(#hg)" strokeWidth="0.8" />
            ))}
            <line x1="100" y1="0" x2="100" y2="200" stroke="url(#hg)" strokeWidth="0.8" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="url(#hg)" strokeWidth="0.8" />
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <circle
                  key={deg}
                  cx={100 + 90 * Math.cos(rad)}
                  cy={100 + 90 * Math.sin(rad)}
                  r="2.5"
                  fill="#22d3ee"
                />
              );
            })}
          </svg>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Command Center
            </span>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                className="text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]"
                style={{ fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif" }}
              >
                {name ? (
                  <>
                    Welcome back,{" "}
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #22d3ee 0%, #818cf8 55%, #a78bfa 100%)",
                      }}
                    >
                      {name}
                    </span>
                  </>
                ) : (
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #22d3ee 0%, #818cf8 100%)",
                    }}
                  >
                    Röntgen AI
                  </span>
                )}
              </h1>
              <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-foreground/45">
                Six AI tools for architecture, data, code, and incidents — one account,
                shared usage pool.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-semibold capitalize text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                {isLoading ? "…" : plan} plan
              </span>
              {plan === "free" ? (
                <Button
                  asChild
                  size="sm"
                  className="border-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 hover:to-blue-400"
                >
                  <Link href="/app/billing">
                    <Crown className="mr-1.5 h-3 w-3" />
                    Upgrade
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="secondary">
                  <Link href="/app/billing">Billing</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {isError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-200/90">
          {error instanceof Error ? error.message : "Could not reach API"} — start{" "}
          <code className="text-amber-100">api-gateway</code> on port 8000 for usage
          &amp; products.
        </div>
      ) : null}

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Activity}
          label="Total queries this month"
          value={isLoading ? "…" : String(totalUsed)}
          delay={0.1}
          accent="from-cyan-400 to-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Tools available"
          value="7 live"
          sub="3 on the roadmap"
          delay={0.16}
          accent="from-emerald-400 to-teal-500"
        />
        <StatCard
          icon={Crown}
          label="Current plan"
          value={
            isLoading
              ? "…"
              : plan.charAt(0).toUpperCase() + plan.slice(1)
          }
          sub={plan === "free" ? "Upgrade for GitHub tools" : "Full access"}
          delay={0.22}
          accent="from-violet-400 to-purple-500"
        />
      </div>

      {/* ── Product grid ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-foreground/70">
              Launch workspace
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              7 live
            </span>
          </div>
          <span className="text-[11px] text-foreground/25">Click to open →</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableProducts.map((p, i) => (
            <ProductLaunchCard
              key={p.slug}
              product={p}
              index={i}
              usage={me?.usage?.[p.slug] as UsageRow}
            />
          ))}
        </div>
      </section>

      {/* ── Usage + Activity ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Usage breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/70">
              Usage this month
            </h2>
            <Link
              href="/app/billing"
              className="text-[11px] text-cyan-400 transition hover:text-cyan-300"
            >
              Manage plan →
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a12] p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="space-y-3">
              {availableProducts.map((p) => {
                const row = me?.usage?.[p.slug] as UsageRow;
                const used = row?.used ?? 0;
                const limit = row?.limit;
                const pct =
                  limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                const limitLabel =
                  limit === undefined
                    ? "—"
                    : limit < 0
                      ? "∞"
                      : limit === 0
                        ? "Pro+"
                        : String(limit);
                return (
                  <div key={p.slug} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br",
                        p.accent,
                      )}
                    >
                      <ProductIcon
                        name={p.icon}
                        className="h-3 w-3 text-slate-950"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-foreground/55">{p.name}</span>
                        <span className="font-mono text-foreground/35">
                          {isLoading ? "…" : used}
                          <span className="text-foreground/22"> / {limitLabel}</span>
                        </span>
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                            p.accent,
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Recent activity */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/70">
              Recent activity
            </h2>
            <span className="text-[11px] text-foreground/25">Session history</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a12] p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="space-y-2">
              {RECENT_ACTIVITY.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/10 hover:bg-white/[0.035]"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                      item.color,
                    )}
                  >
                    <Clock className="h-3 w-3 text-slate-950" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white/80">
                      {item.action}
                    </p>
                    <p className="text-[11px] text-foreground/35">{item.product}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-foreground/28">
                    {item.time}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-center text-[11px] text-foreground/22">
                Full session history coming soon
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── Coming soon ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.5 }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-foreground/70">
            On the roadmap
          </h2>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-foreground/45">
            Waitlist open
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {comingSoonProducts.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44 + i * 0.06, duration: 0.45 }}
            >
              <Link href="/#waitlist" className="group block">
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.08] bg-[#070a12]/60 p-4 transition hover:border-white/14 hover:bg-[#070a12]">
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br opacity-55 transition group-hover:opacity-80",
                        p.accent,
                      )}
                    >
                      <ProductIcon
                        name={p.icon}
                        className="h-4 w-4 text-slate-950"
                      />
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/38">
                      Soon
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-white/65 transition group-hover:text-white/85">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/32">
                    {p.tagline}
                  </p>
                  <div className="mt-3 flex items-center gap-0.5 text-[11px] text-cyan-400/45 transition group-hover:text-cyan-400/75">
                    <span>Join waitlist</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-foreground/30">
          <Link href="/#waitlist" className="text-cyan-400/70 transition hover:text-cyan-400">
            Join the waitlist
          </Link>{" "}
          for Orbit, Aegis, Echo &amp; Arena
        </p>
      </motion.section>

      {/* ── Tip banner ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.58, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-r from-cyan-400/[0.04] to-transparent px-5 py-4"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/30 via-transparent to-transparent" />
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-xs leading-relaxed text-foreground/48">
            <strong className="text-foreground/72">Pro tip:</strong> Sentinel &amp;
            Forge require a Pro plan and{" "}
            <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-cyan-300/80">
              GITHUB_TOKEN
            </code>{" "}
            on the API. Blueprint, Pulse, Atlas, and Radar work on Free with
            DeepSeek configured.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
