"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Code2,
  FileImage,
  Layers,
  Loader2,
  Scan,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  BlueprintAtmosphere,
  FadeIn,
} from "@/components/blueprint/shell";
import { MiniScore } from "@/components/blueprint/score-ring";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createBlueprintReview,
  listBlueprintReviews,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

type InputTab = "describe" | "mermaid" | "diagram";

// ─── BlueprintGrid ────────────────────────────────────────────────────────────

function BlueprintGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "linear-gradient(rgba(34,211,238,0.035) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(34,211,238,0.035) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "48px 48px",
      }}
    />
  );
}

// ─── ReticleCorners ───────────────────────────────────────────────────────────

function ReticleCorners({ alpha = 0.32 }: { alpha?: number }) {
  const s = `rgba(34,211,238,${alpha})`;
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
  "Scalability",
  "Reliability",
  "SPOF Detection",
  "Bottlenecks",
  "Latency Paths",
  "Security Surface",
  "Cost Efficiency",
  "Data Flow",
];

function CapabilityStrip() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/28">
        Analyzes
      </span>
      {CAPABILITIES.map((cap, i) => (
        <motion.span
          key={cap}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.04, duration: 0.3 }}
          className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[11px] text-foreground/45 transition hover:border-cyan-400/22 hover:text-foreground/65"
        >
          <span className="h-1 w-1 rounded-full bg-cyan-400/45" />
          {cap}
        </motion.span>
      ))}
    </div>
  );
}

// ─── TelemetryRow ─────────────────────────────────────────────────────────────

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "AVG TIME", value: "< 60 s" },
  { label: "DIMENSIONS", value: "7 axes" },
  { label: "OUTPUT", value: "Scores + Fixes" },
];

function TelemetryRow() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.05] pt-4">
      {TELEMETRY.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 + i * 0.06 }}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/25">
            {t.label}
          </span>
          <span className="font-mono text-[11px] font-semibold text-cyan-300/55">
            {t.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── ScanningOverlay ─────────────────────────────────────────────────────────

function ScanningOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#060910]/94 backdrop-blur-sm"
        >
          {/* Scanline moving across overlay */}
          <div className="blueprint-scan-beam pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Radar rings */}
          <div className="relative mb-7 flex h-36 w-36 items-center justify-center">
            <div className="blueprint-radar absolute inset-0 rounded-full border border-cyan-400/28" />
            <div className="blueprint-radar-delay absolute inset-0 scale-75 rounded-full border border-cyan-400/18" />
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/10"
              style={{ transform: "scale(0.5)" }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] to-blue-500/[0.04]">
              <Scan className="h-9 w-9 text-cyan-400/65" />
            </div>
          </div>

          <p
            className="font-bold uppercase tracking-[0.35em] text-cyan-300"
            style={{ fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif", fontSize: "1rem" }}
          >
            Initializing Scan
          </p>

          <div className="mt-3 flex gap-2">
            {[0, 0.18, 0.36].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-cyan-400/45"
                animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.3, delay: d, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-foreground/28">
            Powered by DeepSeek · typically under 60 s
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CircuitDecoration ────────────────────────────────────────────────────────

function CircuitDecoration() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 opacity-[0.025]"
      viewBox="0 0 160 160"
      fill="none"
    >
      <path d="M160 80 L120 80 L120 40 L80 40 L80 0" stroke="#22d3ee" strokeWidth="1" />
      <path d="M160 120 L100 120 L100 60 L60 60 L60 0" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="120" cy="80" r="3" fill="#22d3ee" />
      <circle cx="80" cy="40" r="3" fill="#22d3ee" />
      <circle cx="100" cy="120" r="3" fill="#22d3ee" />
      <circle cx="60" cy="60" r="3" fill="#22d3ee" />
      <path d="M0 100 L40 100 L40 140 L80 140 L80 160" stroke="#22d3ee" strokeWidth="1" />
      <circle cx="40" cy="100" r="3" fill="#22d3ee" />
      <circle cx="80" cy="140" r="3" fill="#22d3ee" />
    </svg>
  );
}

// ─── BlueprintHero ────────────────────────────────────────────────────────────

function BlueprintHero({
  usageUsed,
  usageLimit,
  usagePct,
}: {
  usageUsed: number | undefined;
  usageLimit: number | undefined;
  usagePct: number;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-400/[0.14] bg-gradient-to-br from-[#070d1a] via-[#060910] to-[#05070d] p-6 sm:p-8">
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/12 to-transparent" />
      {/* Reticle corners */}
      <ReticleCorners alpha={0.28} />

      {/* Radar target decoration — top-right */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-72 w-72 opacity-[0.065]">
        <svg viewBox="0 0 240 240" fill="none">
          {[100, 74, 50, 26].map((r) => (
            <circle key={r} cx="120" cy="120" r={r} stroke="#22d3ee" strokeWidth="1" />
          ))}
          <line x1="20" y1="120" x2="220" y2="120" stroke="#22d3ee" strokeWidth="0.6" />
          <line x1="120" y1="20" x2="120" y2="220" stroke="#22d3ee" strokeWidth="0.6" />
          <line x1="55" y1="55" x2="185" y2="185" stroke="#22d3ee" strokeWidth="0.4" strokeDasharray="4 8" />
          <line x1="185" y1="55" x2="55" y2="185" stroke="#22d3ee" strokeWidth="0.4" strokeDasharray="4 8" />
          {[0, 90, 180, 270].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <circle key={deg} cx={120 + 100 * Math.cos(r)} cy={120 + 100 * Math.sin(r)} r="4" fill="#22d3ee" />;
          })}
        </svg>
      </div>

      {/* Moving scan beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 overflow-hidden">
        <div className="blueprint-scan-beam absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left — icon + title */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/22 blur-xl" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/30">
              <Layers className="h-7 w-7 text-slate-950" />
            </span>
            <span className="blueprint-radar absolute -inset-1.5 rounded-3xl border border-cyan-400/28" />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400">
                Architecture X-Ray · Online
              </span>
            </div>

            <h1
              className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-[3.2rem]"
              style={{
                fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif",
                backgroundImage: "linear-gradient(135deg, #e8faff 0%, #22d3ee 30%, #60a5fa 75%, #a78bfa 100%)",
              }}
            >
              Blueprint
            </h1>
            <p className="mt-1 text-[13px] text-foreground/42">
              See through your systems — scalability, reliability, tradeoffs
            </p>
          </div>
        </div>

        {/* Right — quota + stat cards */}
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          {/* Quota */}
          <div className="rounded-2xl border border-white/[0.07] bg-black/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-cyan-400/55" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
                  Quota
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-cyan-300/65">
                {usageUsed !== undefined
                  ? `${usageUsed} / ${(usageLimit ?? 0) < 0 ? "∞" : usageLimit}`
                  : "— / —"}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/25">this month</p>
          </div>
          {/* Status pill */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/14 bg-emerald-400/[0.05] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400/80">All systems operational</span>
            </div>
            <Activity className="h-3 w-3 text-emerald-400/50" />
          </div>
        </div>
      </div>

      {/* Telemetry row */}
      <TelemetryRow />
    </div>
  );
}

// ─── BlueprintPage ────────────────────────────────────────────────────────────

export default function BlueprintPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mermaid, setMermaid] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<InputTab>("describe");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const usage = me?.usage?.blueprint;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const history = useQuery({
    queryKey: ["blueprint-reviews"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listBlueprintReviews(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.reviews ?? [];
      const pending = items.some((r) => ["queued", "running"].includes(r.status));
      return pending ? 2500 : false;
    },
  });

  const onFile = useCallback(async (f: File | null) => {
    setFile(f);
    if (f) {
      const url = await fileToBase64(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");

        let imageBase64: string | undefined;
        let imageContentType: string | undefined;
        let filename: string | undefined;
        if (file) {
          imageBase64 = await fileToBase64(file);
          imageContentType = file.type || "image/png";
          filename = file.name;
        }

        const res = await createBlueprintReview(token, {
          title: title.trim() || undefined,
          description: description.trim(),
          mermaid: mermaid.trim() || undefined,
          imageBase64,
          imageContentType,
          filename,
        });

        await queryClient.invalidateQueries({ queryKey: ["blueprint-reviews"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/blueprint/${res.review.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Blueprint limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Review failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [description, file, getToken, mermaid, queryClient, router, title],
  );

  const tabs: {
    id: InputTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hint: string;
  }[] = [
    { id: "describe", label: "Describe", icon: Sparkles, hint: "Plain language" },
    { id: "mermaid", label: "Mermaid", icon: Code2, hint: "flowchart / sequence" },
    { id: "diagram", label: "Diagram", icon: FileImage, hint: "PNG / JPEG / WebP" },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      <BlueprintAtmosphere />
      <BlueprintGrid />

      <FadeIn>
        <BlueprintHero
          usageUsed={usage?.used}
          usageLimit={usage?.limit}
          usagePct={usagePct}
        />
      </FadeIn>

      {/* Capability strip */}
      <FadeIn delay={0.12}>
        <CapabilityStrip />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1fr_296px]">
        {/* ── Composer ─────────────────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <form onSubmit={onSubmit}>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#060910]"
              style={{
                animation: submitting ? "none" : "bp-border-breathe 4s ease-in-out infinite",
              }}
            >
              {/* Top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
              {/* Circuit decoration bottom-right */}
              <CircuitDecoration />
              {/* Reticle corners */}
              <ReticleCorners alpha={0.2} />

              {/* Scanning overlay */}
              <ScanningOverlay visible={submitting} />

              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#040609]/90 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/65" />
                  <span className="ml-3 font-mono text-[10px] text-foreground/28">
                    blueprint.session
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-cyan-400/50" />
                  <span className="font-mono text-[10px] font-semibold tracking-widest text-cyan-400/50">
                    READY
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {/* System name */}
                <div>
                  <label className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-cyan-400/55">SYS://</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      System name
                    </span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Checkout service · multi-region"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/[0.07] bg-black/45 px-4 py-3 text-sm text-white placeholder:text-foreground/22 transition focus:border-cyan-400/42 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                  />
                </div>

                {/* Input-mode tabs */}
                <div>
                  <div className="mb-4 flex gap-1 overflow-hidden rounded-xl border border-white/[0.06] bg-black/45 p-1">
                    {tabs.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          className={cn(
                            "group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs transition",
                            active ? "text-cyan-100" : "text-foreground/35 hover:text-foreground/60",
                          )}
                        >
                          {active ? (
                            <motion.span
                              layoutId="bp-tab-pill"
                              className="absolute inset-0 rounded-lg bg-gradient-to-b from-cyan-500/[0.18] to-cyan-600/[0.04] ring-1 ring-inset ring-cyan-400/24"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.36 }}
                            />
                          ) : null}
                          <Icon className="relative h-4 w-4" />
                          <span className="relative hidden text-[10px] font-semibold sm:block">{t.label}</span>
                          <span className="relative hidden text-[9px] text-foreground/26 sm:block">{t.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "describe" && (
                      <motion.div key="describe" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={9}
                          placeholder={`Describe components, data stores, traffic, SLAs…\n\nExample:\n• API gateway → 3 microservices → Postgres\n• Single region, ~10k DAU\n• No message queue; sync AI calls in request path\n• No CDN; static assets from origin`}
                          className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/40 px-4 py-3 text-sm leading-relaxed text-foreground/88 placeholder:text-foreground/20 transition focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                        />
                      </motion.div>
                    )}

                    {tab === "mermaid" && (
                      <motion.div key="mermaid" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                        <div className="overflow-hidden rounded-xl border border-cyan-400/[0.13] bg-[#020406]">
                          <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#010304] px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-3 w-3 text-cyan-400/55" />
                              <span className="font-mono text-[10px] text-foreground/30">diagram.mmd</span>
                            </div>
                            <span className="rounded bg-cyan-400/[0.09] px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400/65">
                              Mermaid
                            </span>
                          </div>
                          <div className="flex">
                            <div className="select-none border-r border-white/[0.04] bg-black/30 px-3 py-3 text-right font-mono text-[11px] leading-[1.75rem] text-foreground/16">
                              {Array.from({ length: 10 }, (_, i) => <div key={i}>{i + 1}</div>)}
                            </div>
                            <textarea
                              value={mermaid}
                              onChange={(e) => setMermaid(e.target.value)}
                              rows={10}
                              placeholder={"flowchart LR\n  Client --> API\n  API --> Queue\n  Queue --> Workers\n  Workers --> DB[(Postgres)]"}
                              className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-[1.75rem] text-cyan-100/80 placeholder:text-foreground/18 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {tab === "diagram" && (
                      <motion.div key="diagram" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void onFile(f); }}
                          className={cn(
                            "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                            dragOver ? "border-cyan-400/55 bg-cyan-400/[0.07]" : "border-white/[0.08] bg-black/20 hover:border-cyan-400/28",
                          )}
                        >
                          {preview ? (
                            <div className="relative p-4">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preview} alt="Diagram preview" className="mx-auto max-h-56 rounded-lg object-contain ring-1 ring-white/[0.07]" />
                              <button
                                type="button"
                                onClick={() => void onFile(null)}
                                className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/70 p-1.5 text-white/70 backdrop-blur transition hover:bg-red-500/28 hover:text-red-300"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <p className="mt-2 truncate text-center font-mono text-[11px] text-foreground/30">{file?.name}</p>
                            </div>
                          ) : (
                            <label className="flex cursor-pointer flex-col items-center gap-4 px-4 py-16">
                              <div className="relative flex h-20 w-20 items-center justify-center">
                                <div className="blueprint-radar absolute inset-0 rounded-full border border-cyan-400/26" />
                                <div className="blueprint-radar-delay absolute inset-0 scale-[0.7] rounded-full border border-cyan-400/16" />
                                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/22 bg-cyan-400/[0.05]">
                                  <Upload className="h-6 w-6 text-cyan-300/75" />
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-white/85">Drop architecture diagram</p>
                                <p className="mt-1 text-xs text-foreground/32">PNG, JPEG, or WebP · up to 8 MB</p>
                              </div>
                              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
                            </label>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Context notes */}
                {tab !== "describe" && (
                  <div>
                    <label className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-cyan-400/55">OPT://</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">Context notes</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional context alongside your diagram or code…"
                      className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/40 px-4 py-3 text-sm text-foreground/88 placeholder:text-foreground/20 transition focus:border-cyan-400/38 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                    />
                  </div>
                )}

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
                    {/* Rotating conic border */}
                    {!submitting && (
                      <div
                        className="absolute -inset-[2px] rounded-xl opacity-65"
                        style={{
                          background: "conic-gradient(from var(--bp-angle, 0deg), #22d3ee, #3b82f6, #8b5cf6, #22d3ee)",
                          animation: "bp-conic-spin 3s linear infinite",
                        }}
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="relative z-10 w-full border-0 bg-gradient-to-r from-cyan-500 to-blue-600 py-6 text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/18 hover:from-cyan-400 hover:to-blue-500"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Initializing scan…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Run Blueprint Review
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2.5 text-center text-[11px] text-foreground/26">
                    Powered by DeepSeek · results typically in under 60 s
                  </p>
                </div>
              </div>
            </div>
          </form>
        </FadeIn>

        {/* ── Mission Log ──────────────────────────────────────────────── */}
        <FadeIn delay={0.16} className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400/55">
              SYS:LOG
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/16 to-transparent" />
            {history.data?.reviews.length ? (
              <span className="font-mono text-[10px] text-foreground/25">
                {history.data.reviews.length} sessions
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {history.isLoading ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#060910] px-4 py-10 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400/40" />
                <p className="text-xs text-foreground/30">Loading sessions…</p>
              </div>
            ) : history.isError ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-6 text-center text-xs text-amber-300/70">
                {history.error instanceof Error ? history.error.message : "Could not load history"}
              </div>
            ) : !history.data?.reviews.length ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] bg-[#060910]/55 px-4 py-14 text-center">
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
                  <div className="blueprint-radar absolute inset-0 rounded-full border border-cyan-400/20" />
                  <div className="blueprint-radar-delay absolute inset-0 scale-[0.65] rounded-full border border-cyan-400/12" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/18 bg-cyan-400/[0.05]">
                    <Layers className="h-5 w-5 text-cyan-400/40" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-foreground/35">No scans yet</p>
                <p className="mt-1 text-[11px] text-foreground/18">Your first review appears here.</p>
              </div>
            ) : (
              history.data.reviews.map((r, i) => {
                const pending = ["queued", "running"].includes(r.status);
                const succeeded = r.status === "succeeded";
                const failed = r.status === "failed";

                const statusPill = succeeded
                  ? "text-emerald-400 bg-emerald-400/[0.08] ring-1 ring-emerald-400/18"
                  : failed
                    ? "text-red-400 bg-red-400/[0.08] ring-1 ring-red-400/18"
                    : "animate-pulse text-cyan-400 bg-cyan-400/[0.08] ring-1 ring-cyan-400/18";

                const leftBorder = succeeded
                  ? "border-l-emerald-500/45"
                  : failed
                    ? "border-l-red-500/40"
                    : "border-l-cyan-400/50";

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.32 }}
                  >
                    <Link href={`/app/blueprint/${r.id}`} className="group block">
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-xl border border-l-2 border-white/[0.06] bg-[#060910] p-3.5 transition-all duration-200 group-hover:border-white/[0.1] group-hover:bg-white/[0.022]",
                          leftBorder,
                        )}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                        {/* Scan line on succeeded cards */}
                        {succeeded && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-40">
                            <div className="blueprint-scan-beam absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-white/80 transition group-hover:text-white">
                              {r.title || "Untitled scan"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-foreground/33">
                              {r.descriptionPreview || "Architecture review"}
                            </p>
                          </div>
                          {r.scores?.overall != null && <MiniScore value={r.scores.overall} />}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/22">
                            {new Date(r.createdAt).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <span className={cn("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider", statusPill)}>
                            {pending ? "scanning" : r.status}
                          </span>
                        </div>

                        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/16 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </FadeIn>
      </div>

      <style>{`
        @property --bp-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes bp-conic-spin {
          to { --bp-angle: 360deg; }
        }
        @keyframes bp-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
          50% { box-shadow: 0 0 22px 2px rgba(34,211,238,0.055); }
        }
      `}</style>
    </div>
  );
}
