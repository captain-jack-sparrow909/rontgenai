"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  GitBranch,
  Globe,
  Loader2,
  Map,
  Network,
  Route,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import {
  AtlasAtmosphere,
  AtlasFade,
} from "@/components/atlas/shell";
import { Button } from "@/components/ui/button";
import { ApiError, createAtlasMap, listAtlasMaps } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

// ─── RepoDotGrid ──────────────────────────────────────────────────────────────

function RepoDotGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(167,139,250,0.22) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    />
  );
}

// ─── ReticleCorners ───────────────────────────────────────────────────────────

function ReticleCorners({ alpha = 0.28 }: { alpha?: number }) {
  const s = `rgba(167,139,250,${alpha})`;
  return (
    <>
      <svg className="pointer-events-none absolute left-3 top-3 h-4 w-4" viewBox="0 0 14 14" fill="none">
        <path d="M0 10 L0 0 L10 0" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="pointer-events-none absolute right-3 top-3 h-4 w-4" viewBox="0 0 14 14" fill="none">
        <path d="M14 10 L14 0 L4 0" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="pointer-events-none absolute bottom-3 left-3 h-4 w-4" viewBox="0 0 14 14" fill="none">
        <path d="M0 4 L0 14 L10 14" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="pointer-events-none absolute bottom-3 right-3 h-4 w-4" viewBox="0 0 14 14" fill="none">
        <path d="M14 4 L14 14 L4 14" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
}

// ─── CapabilityStrip ──────────────────────────────────────────────────────────

const CAPABILITIES = [
  "Architecture Maps",
  "Module Explanations",
  "Dependency Trees",
  "Onboarding Guides",
  "Code Flow",
  "Entry Points",
  "Tech Stack",
  "README Analysis",
];

function CapabilityStrip() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/28">
        Maps
      </span>
      {CAPABILITIES.map((cap, i) => (
        <motion.span
          key={cap}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18 + i * 0.04, duration: 0.3 }}
          className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[11px] text-foreground/45 transition hover:border-violet-400/22 hover:text-foreground/65"
        >
          <span className="h-1 w-1 rounded-full bg-violet-400/45" />
          {cap}
        </motion.span>
      ))}
    </div>
  );
}

// ─── TelemetryRow ─────────────────────────────────────────────────────────────

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "SOURCE", value: "GitHub API" },
  { label: "OUTPUT", value: "Mermaid + Docs" },
  { label: "DEPTH", value: "Full tree" },
];

function TelemetryRow() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.05] pt-4">
      {TELEMETRY.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.06 }}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/25">
            {t.label}
          </span>
          <span className="font-mono text-[11px] font-semibold text-violet-300/55">
            {t.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── NetworkDecoration ────────────────────────────────────────────────────────

// Simple repo-tree topology: root → src → components/hooks/api, docs, lib
const NODES = [
  { x: 110, y: 18, r: 5.5, label: "root" },
  { x: 55, y: 60, r: 4, label: "src" },
  { x: 175, y: 55, r: 3.5, label: "docs" },
  { x: 20, y: 105, r: 3.5, label: "comp" },
  { x: 65, y: 105, r: 3.5, label: "hooks" },
  { x: 110, y: 105, r: 3.5, label: "api" },
  { x: 175, y: 105, r: 3.5, label: "lib" },
  { x: 10, y: 148, r: 2.5, label: "Btn" },
  { x: 32, y: 148, r: 2.5, label: "Tbl" },
  { x: 65, y: 148, r: 2.5, label: "use" },
  { x: 110, y: 148, r: 2.5, label: "api" },
];
const EDGES = [
  [0, 1], [0, 2], [1, 3], [1, 4], [1, 5], [0, 6],
  [3, 7], [3, 8], [4, 9], [5, 10],
];

function NetworkDecoration({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <svg
      className="pointer-events-none"
      style={{ opacity }}
      viewBox="0 0 210 165"
      fill="none"
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x} y1={NODES[a].y}
          x2={NODES[b].x} y2={NODES[b].y}
          stroke="#a78bfa"
          strokeWidth="0.8"
          strokeDasharray={i > 5 ? "3 4" : undefined}
        />
      ))}
      {NODES.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r + 3} fill="rgba(139,92,246,0.08)" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="rgba(139,92,246,0.18)" stroke="#a78bfa" strokeWidth="0.8" />
          <text x={n.x} y={n.y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill="rgba(196,181,253,0.7)" fontFamily="monospace">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── MappingOverlay ───────────────────────────────────────────────────────────

const SAT_LABELS = ["src", "lib", "api", "docs", "test", "pkg"];
const SAT_R = 50;

function MappingOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#07050f]/93 backdrop-blur-sm"
        >
          {/* Scan beam */}
          <div
            className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/35 to-transparent"
            style={{ animation: "at-scan-beam 2.6s linear infinite" }}
          />

          {/* Node graph animation */}
          <div className="relative mb-6 flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full" viewBox="-70 -70 140 140" fill="none">
              {SAT_LABELS.map((label, i) => {
                const angle = (i * 60 * Math.PI) / 180;
                const x = SAT_R * Math.cos(angle);
                const y = SAT_R * Math.sin(angle);
                return (
                  <motion.g
                    key={label}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.18, duration: 0.3 }}
                  >
                    <motion.path
                      d={`M 0 0 L ${x} ${y}`}
                      stroke="rgba(167,139,250,0.35)"
                      strokeWidth="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.15 + i * 0.18, duration: 0.4 }}
                    />
                    <circle cx={x} cy={y} r="9" fill="rgba(139,92,246,0.12)" stroke="rgba(167,139,250,0.45)" strokeWidth="0.9" />
                    <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="4" fill="rgba(196,181,253,0.8)" fontFamily="monospace">
                      {label}
                    </text>
                  </motion.g>
                );
              })}
              {/* Hub */}
              <motion.circle cx="0" cy="0" r="14" fill="rgba(139,92,246,0.14)" stroke="rgba(167,139,250,0.55)" strokeWidth="1.2"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="0" cy="0" r="5" fill="rgba(167,139,250,0.75)" />
              <text x="0" y="0.5" textAnchor="middle" dominantBaseline="middle" fontSize="3.5" fill="rgba(237,233,254,0.9)" fontFamily="monospace">repo</text>
            </svg>
          </div>

          <p
            className="font-bold uppercase tracking-[0.32em] text-violet-300"
            style={{ fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif", fontSize: "0.95rem" }}
          >
            Mapping Repository
          </p>

          <div className="mt-3 flex gap-2">
            {[0, 0.18, 0.36].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-violet-400/45"
                animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.3, delay: d, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-foreground/28">
            Fetching tree, README, and entry files from GitHub
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Example repos ────────────────────────────────────────────────────────────

const EXAMPLE_REPOS = [
  { slug: "vercel/next.js", lang: "JS", stars: "127k" },
  { slug: "facebook/react", lang: "JS", stars: "228k" },
  { slug: "withastro/astro", lang: "TS", stars: "49k" },
];

// ─── AtlasHero ────────────────────────────────────────────────────────────────

function AtlasHero({
  usageUsed,
  usageLimit,
  usagePct,
}: {
  usageUsed: number | undefined;
  usageLimit: number | undefined;
  usagePct: number;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-violet-400/[0.14] bg-gradient-to-br from-[#0e0814] via-[#090710] to-[#05070d] p-6 sm:p-8">
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/55 to-transparent" />
      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/10 to-transparent" />
      <ReticleCorners alpha={0.22} />

      {/* Network graph decoration — top right */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-60 w-56">
        <NetworkDecoration opacity={0.065} />
      </div>

      {/* Scan beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
        <div
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
          style={{ animation: "at-scan-beam 3s linear infinite" }}
        />
      </div>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-violet-400/22 blur-xl" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-300 via-violet-400 to-purple-600 shadow-xl shadow-violet-500/30">
              <Map className="h-7 w-7 text-slate-950" />
            </span>
            <span
              className="absolute -inset-1.5 rounded-3xl border border-violet-400/28"
              style={{ animation: "at-radar 3s linear infinite" }}
            />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400">
                Repo Cartography · Online
              </span>
            </div>

            <h1
              className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-[3.2rem]"
              style={{
                fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif",
                backgroundImage: "linear-gradient(135deg, #f5f3ff 0%, #a78bfa 30%, #8b5cf6 65%, #c084fc 100%)",
              }}
            >
              Atlas
            </h1>
            <p className="mt-1 text-[13px] text-foreground/42">
              Every public repo, mapped and explained — architecture, flows, onboarding
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          <div className="rounded-2xl border border-white/[0.07] bg-black/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-violet-400/55" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
                  Quota
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-violet-300/65">
                {usageUsed !== undefined
                  ? `${usageUsed} / ${(usageLimit ?? 0) < 0 ? "∞" : usageLimit}`
                  : "— / —"}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/25">maps + questions / mo</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-violet-400/14 bg-violet-400/[0.05] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400/80">Public repos supported</span>
            </div>
            <Globe className="h-3 w-3 text-violet-400/50" />
          </div>
        </div>
      </div>

      <TelemetryRow />
    </div>
  );
}

// ─── AtlasPage ────────────────────────────────────────────────────────────────

export default function AtlasPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [repoUrl, setRepoUrl] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"map" | "migration">("map");
  const [migrationTarget, setMigrationTarget] = useState("");
  const [constraints, setConstraints] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.atlas;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const maps = useQuery({
    queryKey: ["atlas-maps"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listAtlasMaps(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.maps ?? [];
      const pending = items.some((m) => ["queued", "running"].includes(m.status));
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");
        const res = await createAtlasMap(token, repoUrl.trim(), {
          analysisMode,
          migrationTarget:
            analysisMode === "migration" ? migrationTarget.trim() : undefined,
          constraints:
            analysisMode === "migration" ? constraints.trim() || undefined : undefined,
          deadline:
            analysisMode === "migration" ? deadline.trim() || undefined : undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["atlas-maps"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/atlas/${res.map.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Atlas limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to map repo");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [analysisMode, constraints, deadline, getToken, migrationTarget, queryClient, repoUrl, router],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <AtlasAtmosphere />
      <RepoDotGrid />

      <AtlasFade>
        <AtlasHero
          usageUsed={usage?.used}
          usageLimit={usage?.limit}
          usagePct={usagePct}
        />
      </AtlasFade>

      <AtlasFade delay={0.12}>
        <CapabilityStrip />
      </AtlasFade>

      <div className="grid gap-6 lg:grid-cols-[1fr_296px]">
        {/* ── Composer ──────────────────────────────────────────────────── */}
        <AtlasFade delay={0.1}>
          <form onSubmit={onSubmit}>
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#09070f]"
              style={{ animation: submitting ? "none" : "at-border-breathe 4s ease-in-out infinite" }}
            >
              {/* Top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent" />
              {/* Network decoration — bottom right */}
              <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 opacity-[0.028]">
                <NetworkDecoration opacity={1} />
              </div>
              <ReticleCorners alpha={0.18} />
              <MappingOverlay visible={submitting} />

              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#060410]/90 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-400/65" />
                  <span className="ml-3 font-mono text-[10px] text-foreground/28">atlas.session</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Network className="h-3 w-3 text-violet-400/50" />
                  <span className="font-mono text-[10px] font-semibold tracking-widest text-violet-400/50">READY</span>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-black/25 p-1.5">
                  {([
                    { mode: "map" as const, label: "Architecture map", Icon: Map },
                    { mode: "migration" as const, label: "Migration planner", Icon: Route },
                  ]).map(({ mode, label, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setAnalysisMode(mode);
                        setError(null);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition",
                        analysisMode === mode
                          ? "border border-violet-400/25 bg-violet-400/10 text-violet-100"
                          : "border border-transparent text-foreground/35 hover:text-foreground/60",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Repo URL input */}
                <div>
                  <label className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-violet-400/55">REPO://</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      GitHub repository
                    </span>
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400/40" />
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="w-full rounded-xl border border-white/[0.07] bg-black/45 py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-foreground/22 transition focus:border-violet-400/42 focus:outline-none focus:ring-2 focus:ring-violet-400/12"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/25">
                    Public GitHub only in v1 · owner/repo shorthand supported
                  </p>
                </div>

                {analysisMode === "migration" ? (
                  <div className="space-y-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.025] p-4">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                        Migration target
                      </label>
                      <input
                        value={migrationTarget}
                        onChange={(e) => setMigrationTarget(e.target.value)}
                        placeholder="e.g. Next.js 16, PostgreSQL, AWS, TypeScript"
                        className="w-full rounded-lg border border-white/[0.07] bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-foreground/22 focus:border-violet-400/42 focus:outline-none focus:ring-2 focus:ring-violet-400/12"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">Constraints</label>
                        <input value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="No downtime, small team…" className="w-full rounded-lg border border-white/[0.07] bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-foreground/22 focus:border-violet-400/42 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">Deadline input</label>
                        <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="e.g. Q4 2026" className="w-full rounded-lg border border-white/[0.07] bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-foreground/22 focus:border-violet-400/42 focus:outline-none" />
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-foreground/28">Atlas creates relative effort and validation gates—never false calendar precision.</p>
                  </div>
                ) : null}

                {/* Example repos */}
                <div>
                  <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/28">
                    Try an example
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {EXAMPLE_REPOS.map((ex) => (
                      <button
                        key={ex.slug}
                        type="button"
                        onClick={() => setRepoUrl(`https://github.com/${ex.slug}`)}
                        className={cn(
                          "group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/30 p-3 text-left transition hover:border-violet-400/28 hover:bg-violet-400/[0.04]",
                          repoUrl === `https://github.com/${ex.slug}` && "border-violet-400/35 bg-violet-400/[0.07]",
                        )}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <p className="font-mono text-[10px] font-semibold text-white/70 group-hover:text-violet-200">
                          {ex.slug.split("/")[1]}
                        </p>
                        <p className="truncate font-mono text-[9px] text-foreground/30">{ex.slug}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-violet-400/10 px-1 py-0.5 font-mono text-[8px] font-bold text-violet-400/65">{ex.lang}</span>
                          <span className="flex items-center gap-0.5 text-[9px] text-foreground/28">
                            <Star className="h-2.5 w-2.5" />
                            {ex.stars}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/26 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
                    {error}{" "}
                    {error.includes("Upgrade") && (
                      <Link href="/app/billing" className="font-medium underline underline-offset-2 transition hover:text-red-200">
                        Open billing →
                      </Link>
                    )}
                  </div>
                )}

                {/* Submit */}
                <div className="pt-1">
                  <div className="relative">
                    {!submitting && (
                      <div
                        className="absolute -inset-[2px] rounded-xl opacity-45"
                        style={{
                          background: "conic-gradient(from var(--at-angle, 0deg), #a78bfa, #7c3aed, #c084fc, #a78bfa)",
                          animation: "at-conic-spin 3s linear infinite",
                        }}
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={submitting || !repoUrl.trim() || (analysisMode === "migration" && !migrationTarget.trim())}
                      size="lg"
                      className="relative z-10 w-full border border-transparent bg-[#09070f] py-6 text-base font-semibold text-violet-200/80 shadow-none transition hover:bg-[#110d1a] hover:text-violet-100 disabled:opacity-40"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          {analysisMode === "migration" ? "Assessing migration…" : "Mapping repository…"}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 opacity-70" />
                          {analysisMode === "migration" ? "Generate migration plan" : "Generate map"}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2.5 text-center text-[11px] text-foreground/26">
                    {analysisMode === "migration"
                      ? "Current state · target architecture · phased rollout · rollback gates"
                      : "Fetches tree · README · entry files · generates Mermaid diagrams"}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </AtlasFade>

        {/* ── Maps Log ──────────────────────────────────────────────────── */}
        <AtlasFade delay={0.16} className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400/55">
              SYS:LOG
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-violet-400/16 to-transparent" />
            {maps.data?.maps.length ? (
              <span className="font-mono text-[10px] text-foreground/25">
                {maps.data.maps.length} maps
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {maps.isLoading ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#09070f] px-4 py-10 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-violet-400/40" />
                <p className="text-xs text-foreground/30">Loading maps…</p>
              </div>
            ) : maps.isError ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-6 text-center text-xs text-amber-300/70">
                {maps.error instanceof Error ? maps.error.message : "Could not load maps"}
              </div>
            ) : !maps.data?.maps.length ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] bg-[#09070f]/55 px-4 py-14 text-center">
                {/* Empty state mini graph */}
                <div className="relative mx-auto mb-4 h-14 w-14">
                  <svg viewBox="-28 -28 56 56" fill="none" className="h-full w-full">
                    {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                      const rad = (deg * Math.PI) / 180;
                      const x = 20 * Math.cos(rad);
                      const y = 20 * Math.sin(rad);
                      return (
                        <g key={i}>
                          <line x1="0" y1="0" x2={x} y2={y} stroke="rgba(167,139,250,0.18)" strokeWidth="0.8" />
                          <circle cx={x} cy={y} r="4" fill="rgba(139,92,246,0.10)" stroke="rgba(167,139,250,0.22)" strokeWidth="0.8" />
                        </g>
                      );
                    })}
                    <circle cx="0" cy="0" r="6" fill="rgba(139,92,246,0.18)" stroke="rgba(167,139,250,0.35)" strokeWidth="1" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-foreground/35">No maps yet</p>
                <p className="mt-1 text-[11px] text-foreground/18">Paste a public repo to begin.</p>
              </div>
            ) : (
              maps.data.maps.map((m, i) => {
                const pending = ["queued", "running"].includes(m.status);
                const succeeded = m.status === "succeeded";
                const failed = m.status === "failed";

                const statusPill = succeeded
                  ? "text-violet-300 bg-violet-400/[0.09] ring-1 ring-violet-400/20"
                  : failed
                    ? "text-red-400 bg-red-400/[0.08] ring-1 ring-red-400/18"
                    : "animate-pulse text-violet-300 bg-violet-400/[0.09] ring-1 ring-violet-400/20";

                const leftBorder = succeeded
                  ? "border-l-violet-500/45"
                  : failed
                    ? "border-l-red-500/40"
                    : "border-l-violet-400/50";

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.32 }}
                  >
                    <Link href={`/app/atlas/${m.id}`} className="group block">
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-xl border border-l-2 border-white/[0.06] bg-[#09070f] p-3.5 transition-all duration-200 group-hover:border-white/[0.1] group-hover:bg-white/[0.02]",
                          leftBorder,
                        )}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

                        {/* Scan beam on succeeded cards */}
                        {succeeded && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-35">
                            <div
                              className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
                              style={{ animation: "at-scan-beam 2.6s linear infinite" }}
                            />
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-white/80 transition group-hover:text-white">
                              {m.fullName || "Untitled map"}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              {m.analysisMode === "migration" ? (
                                <span className="rounded bg-fuchsia-400/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-bold text-fuchsia-300/65">
                                  MIGRATION
                                </span>
                              ) : null}
                              {m.language && (
                                <span className="rounded bg-violet-400/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet-400/60">
                                  {m.language}
                                </span>
                              )}
                              {m.stars != null && (
                                <span className="flex items-center gap-0.5 text-[11px] text-foreground/30">
                                  <Star className="h-3 w-3" />
                                  {m.stars.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Mini node icon */}
                          <div className="shrink-0 opacity-40">
                            <svg viewBox="-14 -14 28 28" className="h-6 w-6" fill="none">
                              {[0, 120, 240].map((deg) => {
                                const rad = (deg * Math.PI) / 180;
                                const x = 9 * Math.cos(rad);
                                const y = 9 * Math.sin(rad);
                                return <g key={deg}><line x1="0" y1="0" x2={x} y2={y} stroke="#a78bfa" strokeWidth="0.8" /><circle cx={x} cy={y} r="2.5" fill="rgba(139,92,246,0.3)" stroke="#a78bfa" strokeWidth="0.7" /></g>;
                              })}
                              <circle cx="0" cy="0" r="3.5" fill="rgba(139,92,246,0.4)" stroke="#a78bfa" strokeWidth="0.8" />
                            </svg>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/22">
                            {new Date(m.createdAt).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <span className={cn("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider", statusPill)}>
                            {pending ? "mapping" : m.status}
                          </span>
                        </div>

                        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/16 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </AtlasFade>
      </div>

      <style>{`
        @property --at-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes at-conic-spin {
          to { --at-angle: 360deg; }
        }
        @keyframes at-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); }
          50% { box-shadow: 0 0 20px 2px rgba(167,139,250,0.05); }
        }
        @keyframes at-scan-beam {
          0% { transform: translateY(-8px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes at-radar {
          0% { transform: scale(1); opacity: 0.28; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
