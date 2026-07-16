"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart2,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  TrendingUp,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  PulseAtmosphere,
  PulseFade,
} from "@/components/pulse/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createPulseSession,
  listPulseSessions,
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

// ─── DataGrid ─────────────────────────────────────────────────────────────────

function DataGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "linear-gradient(rgba(52,211,153,0.028) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(52,211,153,0.028) 1px, transparent 1px)",
          "linear-gradient(rgba(52,211,153,0.012) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(52,211,153,0.012) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "80px 40px, 80px 40px, 20px 20px, 20px 20px",
      }}
    />
  );
}

// ─── ReticleCorners ───────────────────────────────────────────────────────────

function ReticleCorners({ alpha = 0.28 }: { alpha?: number }) {
  const s = `rgba(52,211,153,${alpha})`;
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
  "Natural Language",
  "SQL Generation",
  "Column Profiling",
  "Chart Synthesis",
  "Trend Detection",
  "Anomaly Spotting",
  "Correlation",
  "Export Ready",
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
          transition={{ delay: 0.18 + i * 0.04, duration: 0.3 }}
          className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[11px] text-foreground/45 transition hover:border-emerald-400/22 hover:text-foreground/65"
        >
          <span className="h-1 w-1 rounded-full bg-emerald-400/45" />
          {cap}
        </motion.span>
      ))}
    </div>
  );
}

// ─── TelemetryRow ─────────────────────────────────────────────────────────────

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "FORMATS", value: "CSV / XLSX" },
  { label: "OUTPUT", value: "Charts + SQL" },
  { label: "ANALYSIS", value: "Real-time" },
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
          <span className="font-mono text-[11px] font-semibold text-emerald-300/55">
            {t.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── DataVizDecoration ────────────────────────────────────────────────────────

const BAR_HEIGHTS = [28, 48, 20, 42, 56, 32, 50, 22, 44, 36, 18, 46];

function DataVizDecoration() {
  return (
    <svg
      className="pointer-events-none absolute -right-6 -top-6 h-64 w-64 opacity-[0.055]"
      viewBox="0 0 220 180"
      fill="none"
    >
      {/* Bar chart */}
      {BAR_HEIGHTS.map((h, i) => (
        <rect key={i} x={i * 17} y={80 - h} width="11" height={h} fill="#34d399" rx="1.5" />
      ))}
      {/* x-axis */}
      <line x1="0" y1="80" x2="210" y2="80" stroke="#34d399" strokeWidth="0.6" opacity="0.6" />
      {/* Sparkline below */}
      <polyline
        points="0,130 18,118 36,125 54,108 72,120 90,104 108,115 126,98 144,110 162,102 180,108 198,95 216,100"
        stroke="#34d399"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Dots on sparkline */}
      {[0, 54, 108, 162, 216].map((x, i) => {
        const ys = [130, 108, 115, 102, 100];
        return <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="#34d399" opacity="0.5" />;
      })}
      {/* Data table sketch */}
      <rect x="0" y="148" width="210" height="30" rx="2" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
      <line x1="70" y1="148" x2="70" y2="178" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
      <line x1="140" y1="148" x2="140" y2="178" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
      <line x1="0" y1="162" x2="210" y2="162" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

// ─── ProfilingOverlay ────────────────────────────────────────────────────────

const OVERLAY_BARS = [0.45, 0.72, 0.30, 0.60, 0.85, 0.50, 0.68];

function ProfilingOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#050a07]/94 backdrop-blur-sm"
        >
          {/* Scan beam */}
          <div
            className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent"
            style={{ animation: "ps-scan-beam 2.4s linear infinite" }}
          />

          {/* Animated bar chart */}
          <div className="relative mb-6 flex h-20 items-end gap-2">
            {OVERLAY_BARS.map((h, i) => (
              <motion.div
                key={i}
                className="w-5 rounded-t-sm bg-gradient-to-t from-emerald-600/80 to-teal-300/80"
                style={{ height: "100%", originY: 1 }}
                animate={{ scaleY: [h, h * 0.55 + 0.15, h * 0.85, h * 0.4 + 0.1, h] }}
                transition={{ duration: 1.8, delay: i * 0.14, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>

          <p
            className="font-bold uppercase tracking-[0.32em] text-emerald-300"
            style={{ fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif", fontSize: "0.95rem" }}
          >
            Profiling Data
          </p>

          <div className="mt-3 flex gap-2">
            {[0, 0.18, 0.36].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-emerald-400/45"
                animate={{ opacity: [0.15, 1, 0.15], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.3, delay: d, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-foreground/28">
            Powered by DeepSeek · generating insights from your data
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── PulseHero ────────────────────────────────────────────────────────────────

function PulseHero({
  usageUsed,
  usageLimit,
  usagePct,
}: {
  usageUsed: number | undefined;
  usageLimit: number | undefined;
  usagePct: number;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-emerald-400/[0.14] bg-gradient-to-br from-[#061410] via-[#060a08] to-[#05070d] p-6 sm:p-8">
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/55 to-transparent" />
      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />
      {/* Reticle corners */}
      <ReticleCorners alpha={0.24} />

      {/* Data viz decoration — top right */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-64 w-64">
        <DataVizDecoration />
      </div>

      {/* Scan beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
        <div
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
          style={{ animation: "ps-scan-beam 2.8s linear infinite" }}
        />
      </div>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 shadow-xl shadow-emerald-500/30">
              <Activity className="h-7 w-7 text-slate-950" />
            </span>
            {/* Pulsing ring */}
            <span
              className="absolute -inset-1.5 rounded-3xl border border-emerald-400/28"
              style={{ animation: "ps-radar 3s linear infinite" }}
            />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                Data Intelligence · Online
              </span>
            </div>

            <h1
              className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-[3.2rem]"
              style={{
                fontFamily: "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif",
                backgroundImage: "linear-gradient(135deg, #ecfdf5 0%, #34d399 30%, #2dd4bf 70%, #a7f3d0 100%)",
              }}
            >
              Pulse
            </h1>
            <p className="mt-1 text-[13px] text-foreground/42">
              Chat with your data — insights, SQL, and charts on demand
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[200px]">
          {/* Quota */}
          <div className="rounded-2xl border border-white/[0.07] bg-black/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-emerald-400/55" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
                  Quota
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-emerald-300/65">
                {usageUsed !== undefined
                  ? `${usageUsed} / ${(usageLimit ?? 0) < 0 ? "∞" : usageLimit}`
                  : "— / —"}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/25">sessions + messages / mo</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/14 bg-emerald-400/[0.05] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400/80">All systems operational</span>
            </div>
            <TrendingUp className="h-3 w-3 text-emerald-400/50" />
          </div>
        </div>
      </div>

      <TelemetryRow />
    </div>
  );
}

// ─── PulsePage ────────────────────────────────────────────────────────────────

export default function PulsePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.pulse;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const sessions = useQuery({
    queryKey: ["pulse-sessions"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listPulseSessions(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.sessions ?? [];
      const pending = items.some((s) => ["queued", "running"].includes(s.status));
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) {
        setError("Choose a CSV or Excel file");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");
        const fileBase64 = await fileToBase64(file);
        const res = await createPulseSession(token, {
          title: title.trim() || undefined,
          filename: file.name,
          fileBase64,
          contentType: file.type || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["pulse-sessions"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/pulse/${res.session.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Pulse limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Upload failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [file, getToken, queryClient, router, title],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <PulseAtmosphere />
      <DataGrid />

      <PulseFade>
        <PulseHero
          usageUsed={usage?.used}
          usageLimit={usage?.limit}
          usagePct={usagePct}
        />
      </PulseFade>

      <PulseFade delay={0.12}>
        <CapabilityStrip />
      </PulseFade>

      <div className="grid gap-6 lg:grid-cols-[1fr_296px]">
        {/* ── Composer ──────────────────────────────────────────────────── */}
        <PulseFade delay={0.1}>
          <form onSubmit={onSubmit}>
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#060a08]"
              style={{ animation: submitting ? "none" : "ps-border-breathe 4s ease-in-out infinite" }}
            >
              {/* Top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/28 to-transparent" />
              {/* Data viz decoration bottom-right */}
              <svg
                className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 opacity-[0.022]"
                viewBox="0 0 130 130"
                fill="none"
              >
                {[0, 20, 40, 60, 80, 100].map((x, i) => {
                  const h = [40, 70, 35, 55, 80, 45][i];
                  return <rect key={i} x={x + 6} y={90 - h} width="10" height={h} fill="#34d399" rx="1" />;
                })}
                <line x1="0" y1="90" x2="130" y2="90" stroke="#34d399" strokeWidth="0.6" />
                <polyline points="0,115 22,108 44,112 66,104 88,108 110,100 130,103" stroke="#34d399" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
              {/* Reticle corners */}
              <ReticleCorners alpha={0.18} />

              {/* Profiling overlay */}
              <ProfilingOverlay visible={submitting} />

              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#030704]/90 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/65" />
                  <span className="ml-3 font-mono text-[10px] text-foreground/28">pulse.session</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="h-3 w-3 text-emerald-400/50" />
                  <span className="font-mono text-[10px] font-semibold tracking-widest text-emerald-400/50">READY</span>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {/* Session name */}
                <div>
                  <label className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-emerald-400/55">DS://</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      Session name
                    </span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q1 revenue export · user cohorts"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/[0.07] bg-black/45 px-4 py-3 text-sm text-white placeholder:text-foreground/22 transition focus:border-emerald-400/42 focus:outline-none focus:ring-2 focus:ring-emerald-400/12"
                  />
                </div>

                {/* File drop zone */}
                <div>
                  <label className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-emerald-400/55">FILE://</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      Data file
                    </span>
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) setFile(f);
                    }}
                    className={cn(
                      "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                      dragOver
                        ? "border-emerald-400/55 bg-emerald-400/[0.07]"
                        : "border-white/[0.08] bg-black/20 hover:border-emerald-400/28",
                    )}
                  >
                    {file ? (
                      <div className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/22 bg-emerald-400/[0.07]">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-300/75" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white/85">{file.name}</p>
                            <p className="text-[11px] text-foreground/32">
                              {(file.size / 1024).toFixed(1)} KB
                              {file.name.endsWith(".csv") ? " · CSV" : file.name.endsWith(".xlsx") ? " · Excel" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="rounded-full border border-white/10 bg-black/60 p-1.5 text-white/60 transition hover:bg-red-500/25 hover:text-red-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* File "column" preview pills */}
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {["READY TO PROFILE", file.name.split(".").pop()?.toUpperCase() ?? "FILE", `${(file.size / 1024).toFixed(0)} KB`].map((tag) => (
                            <span key={tag} className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400/65">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-5 px-4 py-14">
                        {/* Animated mini bar chart */}
                        <div className="flex h-14 items-end gap-1">
                          {[0.4, 0.75, 0.55, 0.9, 0.65, 0.45, 0.8].map((h, i) => (
                            <motion.div
                              key={i}
                              className="w-3 rounded-t-sm bg-emerald-400/25"
                              style={{ height: `${h * 100}%`, originY: 1 }}
                              animate={{ scaleY: [1, 0.6, 0.85, 0.5, 1] }}
                              transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                        <div className="text-center">
                          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/22 bg-emerald-400/[0.06]">
                            <Upload className="h-4.5 w-4.5 text-emerald-300/65" />
                          </div>
                          <p className="text-sm font-semibold text-white/80">Drop CSV or Excel</p>
                          <p className="mt-1 text-xs text-foreground/32">.csv · .xlsx · .xls · up to 10 MB</p>
                        </div>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
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
                    {/* Rotating conic border */}
                    {!submitting && (
                      <div
                        className="absolute -inset-[2px] rounded-xl opacity-45"
                        style={{
                          background: "conic-gradient(from var(--ps-angle, 0deg), #34d399, #0d9488, #059669, #34d399)",
                          animation: "ps-conic-spin 3s linear infinite",
                        }}
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={submitting || !file}
                      size="lg"
                      className="relative z-10 w-full border border-transparent bg-[#060a08] py-6 text-base font-semibold text-emerald-200/80 shadow-none transition hover:bg-[#0a1410] hover:text-emerald-100 disabled:opacity-40"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Profiling data…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 opacity-70" />
                          Open in Pulse
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2.5 text-center text-[11px] text-foreground/26">
                    Read-only analysis · sample rows sent to the model
                  </p>
                </div>
              </div>
            </div>
          </form>
        </PulseFade>

        {/* ── Sessions Log ──────────────────────────────────────────────── */}
        <PulseFade delay={0.16} className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400/55">
              SYS:LOG
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/16 to-transparent" />
            {sessions.data?.sessions.length ? (
              <span className="font-mono text-[10px] text-foreground/25">
                {sessions.data.sessions.length} sessions
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {sessions.isLoading ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#060a08] px-4 py-10 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-emerald-400/40" />
                <p className="text-xs text-foreground/30">Loading sessions…</p>
              </div>
            ) : sessions.isError ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-6 text-center text-xs text-amber-300/70">
                {sessions.error instanceof Error ? sessions.error.message : "Could not load sessions"}
              </div>
            ) : !sessions.data?.sessions.length ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] bg-[#060a08]/55 px-4 py-14 text-center">
                {/* Empty state mini chart */}
                <div className="mx-auto mb-4 flex h-10 items-end justify-center gap-1">
                  {[0.3, 0.6, 0.45, 0.75, 0.5, 0.35, 0.65].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-3 rounded-t-sm bg-emerald-400/18"
                      style={{ height: `${h * 100}%`, originY: 1 }}
                      animate={{ scaleY: [1, 0.5, 0.8, 0.4, 1] }}
                      transition={{ duration: 3.5, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-foreground/35">No sessions yet</p>
                <p className="mt-1 text-[11px] text-foreground/18">Upload a spreadsheet to begin.</p>
              </div>
            ) : (
              sessions.data.sessions.map((s, i) => {
                const pending = ["queued", "running"].includes(s.status);
                const succeeded = s.status === "succeeded";
                const failed = s.status === "failed";

                const statusPill = succeeded
                  ? "text-emerald-400 bg-emerald-400/[0.08] ring-1 ring-emerald-400/18"
                  : failed
                    ? "text-red-400 bg-red-400/[0.08] ring-1 ring-red-400/18"
                    : "animate-pulse text-emerald-400 bg-emerald-400/[0.08] ring-1 ring-emerald-400/18";

                const leftBorder = succeeded
                  ? "border-l-emerald-500/45"
                  : failed
                    ? "border-l-red-500/40"
                    : "border-l-emerald-400/50";

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.32 }}
                  >
                    <Link href={`/app/pulse/${s.id}`} className="group block">
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-xl border border-l-2 border-white/[0.06] bg-[#060a08] p-3.5 transition-all duration-200 group-hover:border-white/[0.1] group-hover:bg-white/[0.02]",
                          leftBorder,
                        )}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

                        {/* Scan beam on succeeded cards */}
                        {succeeded && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-35">
                            <div
                              className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/28 to-transparent"
                              style={{ animation: "ps-scan-beam 2.4s linear infinite" }}
                            />
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-white/80 transition group-hover:text-white">
                              {s.title || "Untitled session"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-foreground/33">
                              {s.filename}
                              {s.rowCount != null ? ` · ${s.rowCount.toLocaleString()} rows` : ""}
                              {s.columnCount != null ? ` · ${s.columnCount} cols` : ""}
                            </p>
                          </div>

                          {/* Mini bar sparklet */}
                          <div className="flex h-6 shrink-0 items-end gap-0.5">
                            {[0.5, 0.8, 0.35, 0.65].map((h, bi) => (
                              <div
                                key={bi}
                                className="w-1.5 rounded-t-sm bg-emerald-400/25"
                                style={{ height: `${h * 100}%` }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/22">
                            {new Date(s.createdAt).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <span className={cn("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider", statusPill)}>
                            {pending ? "profiling" : s.status}
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
        </PulseFade>
      </div>

      <style>{`
        @property --ps-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes ps-conic-spin {
          to { --ps-angle: 360deg; }
        }
        @keyframes ps-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 20px 2px rgba(52,211,153,0.05); }
        }
        @keyframes ps-scan-beam {
          0% { transform: translateY(-8px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes ps-radar {
          0% { transform: scale(1); opacity: 0.28; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
