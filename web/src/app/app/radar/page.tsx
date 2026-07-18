"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BellRing,
  Boxes,
  ChevronRight,
  FileText,
  Loader2,
  Rocket,
  Radar as RadarIcon,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  RadarAtmosphere,
  RadarFade,
} from "@/components/radar/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createRadarInvestigation,
  listRadarInvestigations,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

/* ─────────────────────────── utility ─────────────────────────── */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────── static data ─────────────────────────── */

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "INPUT", value: "Logs + Metrics" },
  { label: "OUTPUT", value: "Root Cause" },
  { label: "SCOPE", value: "Incident" },
] as const;

const CAPABILITIES = [
  "Signal Extraction",
  "Root Cause Ranking",
  "Error Patterns",
  "Timeline Reconstruction",
  "Stack Trace Analysis",
  "Metrics Correlation",
  "Auto-Triage",
  "Severity Scoring",
] as const;

/* ─────────────────────────── decorative ─────────────────────────── */

/** Radar dish — concentric rings + conic spokes background */
function RadarGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "repeating-radial-gradient(circle at 50% 38%,rgba(248,113,113,0) 0px,rgba(248,113,113,0) 39px,rgba(248,113,113,0.014) 40px,rgba(248,113,113,0) 41px)",
          "repeating-conic-gradient(rgba(248,113,113,0.011) 0deg,rgba(248,113,113,0.011) 1deg,transparent 1deg,transparent 45deg)",
        ].join(","),
      }}
    />
  );
}

function RadarAmbience() {
  return (
    <>
      <div
        className="pointer-events-none fixed left-[6%] top-[14%] -z-10 h-[460px] w-[460px] rounded-full opacity-[0.03] blur-[110px]"
        style={{ background: "radial-gradient(circle,#f87171,transparent 70%)" }}
      />
      <div
        className="pointer-events-none fixed bottom-[8%] right-[5%] -z-10 h-[380px] w-[380px] rounded-full opacity-[0.026] blur-[100px]"
        style={{ background: "radial-gradient(circle,#fb923c,transparent 70%)" }}
      />
    </>
  );
}

/** Radar dish SVG — concentric rings, spokes, blips, rotating sweep */
function RadarDecoration() {
  return (
    <div className="pointer-events-none absolute -right-6 -top-6 h-72 w-72 overflow-hidden opacity-[0.065]">
      <svg viewBox="0 0 220 220" fill="none" className="h-full w-full">
        {/* Concentric rings */}
        <circle cx="110" cy="110" r="95" stroke="#f87171" strokeWidth="0.6" />
        <circle cx="110" cy="110" r="70" stroke="#f87171" strokeWidth="0.5" strokeDasharray="5 8" />
        <circle cx="110" cy="110" r="48" stroke="#f87171" strokeWidth="0.5" />
        <circle cx="110" cy="110" r="24" stroke="#f87171" strokeWidth="0.5" strokeDasharray="3 5" />
        <circle cx="110" cy="110" r="6" fill="#f87171" opacity="0.6" />
        {/* Radial spokes */}
        <line x1="110" y1="15" x2="110" y2="205" stroke="#f87171" strokeWidth="0.35" strokeOpacity="0.5" />
        <line x1="15" y1="110" x2="205" y2="110" stroke="#f87171" strokeWidth="0.35" strokeOpacity="0.5" />
        <line x1="42" y1="42" x2="178" y2="178" stroke="#f87171" strokeWidth="0.3" strokeOpacity="0.35" strokeDasharray="3 6" />
        <line x1="178" y1="42" x2="42" y2="178" stroke="#f87171" strokeWidth="0.3" strokeOpacity="0.35" strokeDasharray="3 6" />
        {/* Rotating sweep arm */}
        <line
          x1="110" y1="110" x2="205" y2="110"
          stroke="#f87171" strokeWidth="1.2" strokeOpacity="0.7"
          style={{ animation: "rd-radar-sweep 3s linear infinite", transformOrigin: "110px 110px" }}
        />
        {/* Sweep arc (trailing glow) */}
        <path
          d="M 110 110 L 205 110 A 95 95 0 0 0 177 42"
          stroke="none"
          fill="rgba(248,113,113,0.08)"
          style={{ animation: "rd-radar-sweep 3s linear infinite", transformOrigin: "110px 110px" }}
        />
        {/* Blip dots */}
        <circle cx="158" cy="70"  r="3.5" fill="#f87171" opacity="0.85" />
        <circle cx="75"  cy="148" r="2.5" fill="#f87171" opacity="0.6" />
        <circle cx="170" cy="138" r="2"   fill="#f87171" opacity="0.5" />
        <circle cx="58"  cy="82"  r="3"   fill="#f87171" opacity="0.7" />
        <circle cx="132" cy="165" r="2"   fill="#f87171" opacity="0.45" />
      </svg>
    </div>
  );
}

/** Overlay shown while submitting */
function ScanningOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-2xl"
          style={{ background: "rgba(5,7,13,0.88)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Radar dish animation */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            {/* Static rings */}
            {[1, 0.65, 0.38].map((scale, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-red-400/25"
                style={{ inset: `${(1 - scale) * 50}%` }}
              />
            ))}
            {/* Spinning sweep */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, rgba(248,113,113,0.18) 0deg, rgba(248,113,113,0.05) 50deg, transparent 60deg)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            {/* Center dot */}
            <div className="absolute flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
              <span className="relative h-2 w-2 rounded-full bg-red-400" />
            </div>
          </div>
          {/* Blip rows */}
          <div className="flex w-52 flex-col gap-1.5 opacity-55">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.16, duration: 0.35 }}
              >
                <span className="h-1 w-1 flex-shrink-0 rounded-full bg-red-400/70" />
                <div className="h-1.5 flex-1 rounded-full bg-red-400/18" style={{ width: `${55 + i * 8}%` }} />
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300/70">
            Scanning incident…
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export default function RadarPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricsNotes, setMetricsNotes] = useState("");
  const [deploymentContext, setDeploymentContext] = useState("");
  const [infrastructureChanges, setInfrastructureChanges] = useState("");
  const [alerts, setAlerts] = useState("");
  const [serviceTopology, setServiceTopology] = useState("");
  const [logs, setLogs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.radar;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const list = useQuery({
    queryKey: ["radar-investigations"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listRadarInvestigations(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.investigations ?? [];
      const pending = items.some((i) =>
        ["queued", "running"].includes(i.status),
      );
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const hasOperationsContext = [deploymentContext, infrastructureChanges, alerts, serviceTopology].some((value) => value.trim());
      if (!logs.trim() && !file && !hasOperationsContext) {
        setError("Provide logs or operational context");
        return;
      }
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");

        let logBase64: string | undefined;
        let filename: string | undefined;
        if (file) {
          logBase64 = await fileToBase64(file);
          filename = file.name;
        }

        const res = await createRadarInvestigation(token, {
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          metricsNotes: metricsNotes.trim() || undefined,
          logs: logs.trim() || undefined,
          logBase64,
          filename,
          operationsContext: hasOperationsContext
            ? {
                deployment: deploymentContext.trim() || undefined,
                infrastructureChanges: infrastructureChanges.trim() || undefined,
                alerts: alerts.trim() || undefined,
                serviceTopology: serviceTopology.trim() || undefined,
              }
            : undefined,
        });

        await queryClient.invalidateQueries({ queryKey: ["radar-investigations"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/radar/${res.investigation.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Radar limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Investigation failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [alerts, deploymentContext, description, file, getToken, infrastructureChanges, logs, metricsNotes, queryClient, router, serviceTopology, title],
  );

  return (
    <>
      <style>{`
        @property --rd-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes rd-conic-spin   { to { --rd-angle: 360deg; } }
        @keyframes rd-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
          50%       { box-shadow: 0 0 22px 2px rgba(248,113,113,0.055); }
        }
        @keyframes rd-scan-beam {
          0%        { transform: translateY(-40px); opacity: 0; }
          15%, 85%  { opacity: 1; }
          100%      { transform: translateY(40px); opacity: 0; }
        }
        @keyframes rd-radar-sweep  { to { transform: rotate(360deg); } }
      `}</style>

      <RadarGrid />
      <RadarAmbience />
      <RadarAtmosphere />

      <div className="relative mx-auto max-w-5xl">

        {/* ── HERO ── */}
        <RadarFade>
          <div
            className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]"
            style={{ animation: "rd-border-breathe 5s ease-in-out infinite" }}
          >
            <RadarDecoration />

            {/* top shelf */}
            <div
              className="absolute inset-x-0 top-0 h-px opacity-50"
              style={{ background: "linear-gradient(to right,transparent,rgba(248,113,113,0.5),transparent)" }}
            />
            {/* bottom glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-32 opacity-[0.04]"
              style={{ background: "linear-gradient(to top,rgba(248,113,113,1),transparent)" }}
            />

            <div className="relative z-10 px-6 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {/* badge */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/[0.08] px-3 py-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
                      Incident RCA
                    </span>
                  </div>

                  {/* title row */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl bg-red-400/30 blur-xl" />
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-300 via-red-400 to-rose-600 shadow-lg shadow-red-500/30">
                        <RadarIcon className="h-7 w-7 text-slate-950" />
                      </span>
                    </div>

                    <div>
                      <h1
                        className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
                        style={{ backgroundImage: "linear-gradient(to right,#fca5a5,#f87171,#fb923c)" }}
                      >
                        Radar
                      </h1>
                      <p className="mt-1 text-sm text-foreground/45">
                        Find the root cause before the war room ends
                      </p>
                    </div>
                  </div>
                </div>

                {/* quota card */}
                <div className="min-w-[190px] rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
                    <span>Quota</span>
                    <span className="font-mono text-red-300/80">
                      {usage
                        ? `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(to right,#f87171,#fb923c)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePct}%` }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-foreground/35">investigations / month</p>
                </div>
              </div>

              {/* telemetry row */}
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-5">
                {TELEMETRY.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                      {t.label}
                    </span>
                    <ChevronRight className="h-2.5 w-2.5 text-foreground/20" />
                    <span className="font-mono text-[10px] text-red-300/70">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadarFade>

        {/* ── CAPABILITY STRIP ── */}
        <RadarFade delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            {CAPABILITIES.map((cap, i) => (
              <span key={cap} className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/35">
                {i > 0 && <span className="h-px w-3 bg-red-400/20" />}
                {cap}
              </span>
            ))}
          </div>
        </RadarFade>

        {/* ── MAIN GRID ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_296px]">

          {/* COMPOSER */}
          <RadarFade delay={0.08}>
            <form onSubmit={onSubmit}>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]">
                <ScanningOverlay active={submitting} />

                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/30">
                    <span className="h-1 w-1 rounded-full bg-red-400/50" />
                    RADAR CONSOLE · New Investigation
                  </div>
                  <div className="w-14" />
                </div>

                <div className="bg-black/15 p-5 sm:p-6">
                  <div className="space-y-4">

                    {/* Incident title */}
                    <div>
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Incident title
                      </label>
                      <div className="relative">
                        <Activity className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400/40" />
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Checkout 5xx spike · 14:32 UTC"
                          className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-foreground/25 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/15"
                        />
                      </div>
                    </div>

                    {/* Context */}
                    <div>
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Context
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder="What users saw, deploy windows, recent changes…"
                        className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/15"
                      />
                    </div>

                    {/* Metrics notes */}
                    <div>
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Metrics / traces <span className="text-foreground/22 normal-case tracking-normal">(optional)</span>
                      </label>
                      <textarea
                        value={metricsNotes}
                        onChange={(e) => setMetricsNotes(e.target.value)}
                        rows={2}
                        placeholder="CPU 90%, p99 latency 4s, DB connections saturated…"
                        className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/15"
                      />
                    </div>

                    {/* Logs — terminal chrome */}
                    <div className="rounded-xl border border-red-400/10 bg-red-400/[0.025] p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Boxes className="h-3.5 w-3.5 text-red-300/65" />
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/40">Operations context</p>
                        <span className="text-[9px] text-foreground/22">optional when logs are supplied</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/35"><Rocket className="h-3 w-3" /> Deployments</label>
                          <textarea value={deploymentContext} onChange={(e) => setDeploymentContext(e.target.value)} rows={3} placeholder="Version, time, changes, rollout status…" className="w-full resize-y rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2 text-xs text-white placeholder:text-foreground/22 focus:border-red-400/35 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/35"><Boxes className="h-3 w-3" /> Infrastructure changes</label>
                          <textarea value={infrastructureChanges} onChange={(e) => setInfrastructureChanges(e.target.value)} rows={3} placeholder="Terraform plan, scaling, networking, config…" className="w-full resize-y rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2 text-xs text-white placeholder:text-foreground/22 focus:border-red-400/35 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/35"><BellRing className="h-3 w-3" /> Alerts</label>
                          <textarea value={alerts} onChange={(e) => setAlerts(e.target.value)} rows={3} placeholder="Alert name, firing time, threshold, affected service…" className="w-full resize-y rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2 text-xs text-white placeholder:text-foreground/22 focus:border-red-400/35 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground/35"><Activity className="h-3 w-3" /> Service topology</label>
                          <textarea value={serviceTopology} onChange={(e) => setServiceTopology(e.target.value)} rows={3} placeholder="checkout → payments → database…" className="w-full resize-y rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2 text-xs text-white placeholder:text-foreground/22 focus:border-red-400/35 focus:outline-none" />
                        </div>
                      </div>
                      <p className="mt-3 text-[10px] leading-relaxed text-red-100/35">Radar correlates these signals but does not treat timing alone as proof of causation or execute remediation.</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Logs <span className="normal-case tracking-normal text-foreground/22">(optional with operations context)</span>
                      </label>
                      <div className="overflow-hidden rounded-xl border border-white/[0.08]" style={{ background: "#06030a" }}>
                        {/* terminal titlebar */}
                        <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500/55" />
                          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/55" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/55" />
                          <span className="ml-2 font-mono text-[9px] text-foreground/28">incident.log</span>
                          <span className="ml-auto font-mono text-[9px] text-red-400/40">stdin</span>
                        </div>
                        {/* line numbers gutter + textarea */}
                        <div className="relative flex">
                          <div className="hidden select-none border-r border-white/[0.04] bg-black/20 px-2 py-3 font-mono text-[10px] leading-relaxed text-foreground/20 sm:block">
                            {Array.from({ length: 10 }, (_, i) => (
                              <div key={i}>{(i + 1).toString().padStart(2, "0")}</div>
                            ))}
                          </div>
                          <textarea
                            value={logs}
                            onChange={(e) => setLogs(e.target.value)}
                            rows={10}
                            placeholder={`2024-01-15T14:32:01Z ERROR [checkout] payment timeout upstream=stripe latency=3001ms\n2024-01-15T14:32:02Z WARN  [api-gateway] circuit_open service=payments`}
                            className="flex-1 resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-red-100/80 placeholder:text-foreground/22 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* File drop zone */}
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
                        "rounded-xl border-2 border-dashed transition-all duration-200",
                        dragOver
                          ? "border-red-400/60 bg-red-400/[0.08] shadow-[0_0_20px_rgba(248,113,113,0.08)]"
                          : "border-white/[0.10] bg-black/15 hover:border-red-400/30 hover:bg-red-400/[0.03]",
                      )}
                    >
                      {file ? (
                        <div className="flex items-center gap-3 p-4">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.08]">
                            <FileText className="h-4 w-4 text-red-300" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{file.name}</p>
                            <p className="text-[10px] text-foreground/40">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 text-foreground/50 transition hover:border-red-400/30 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center gap-2 px-4 py-7">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border transition",
                            dragOver ? "border-red-400/50 bg-red-400/10" : "border-white/12 bg-black/20",
                          )}>
                            <Upload className="h-4 w-4 text-red-300/70" />
                          </div>
                          <span className="text-[11px] text-foreground/40">
                            Drop a <span className="font-mono text-foreground/55">.log</span> / <span className="font-mono text-foreground/55">.txt</span> file, or click to browse
                          </span>
                          <input
                            type="file"
                            accept=".log,.txt,text/plain"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-xs text-red-300/90"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                        >
                          {error}{" "}
                          {error.includes("Billing") && (
                            <Link href="/app/billing" className="font-semibold underline underline-offset-2">
                              Go to Billing
                            </Link>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <div className="flex justify-end">
                      <div className="relative rounded-xl p-[2px]">
                        {!submitting && (
                          <div
                            className="absolute -inset-[2px] rounded-xl opacity-50"
                            style={{
                              background:
                                "conic-gradient(from var(--rd-angle,0deg),#f87171,#fb923c,#fbbf24,#f87171)",
                              animation: "rd-conic-spin 3s linear infinite",
                            }}
                          />
                        )}
                        <Button
                          type="submit"
                          disabled={submitting}
                          size="lg"
                          className="relative z-10 border border-transparent bg-[#0f0605] px-8 py-6 text-base font-semibold text-red-200/80 shadow-none transition hover:bg-[#180806] hover:text-red-100 disabled:opacity-40"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Scanning…
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4" />
                              Investigate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </form>
          </RadarFade>

          {/* HISTORY SIDEBAR */}
          <RadarFade delay={0.12}>
            <div>
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/30">
                  SYS:LOG · History
                </span>
                {list.data?.investigations.length ? (
                  <span className="font-mono text-[9px] text-foreground/25">
                    {list.data.investigations.length.toString().padStart(2, "0")}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                {list.isLoading ? (
                  <div className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-8 text-center text-[11px] text-foreground/35">
                    Loading…
                  </div>
                ) : list.isError ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-6 text-center text-[11px] text-red-300/80">
                    {list.error instanceof Error ? list.error.message : "Could not load"}
                  </div>
                ) : !list.data?.investigations.length ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                    <RadarIcon className="mx-auto mb-2.5 h-6 w-6 text-foreground/20" />
                    <p className="text-[11px] text-foreground/35">No investigations yet.</p>
                    <p className="mt-1 text-[10px] text-foreground/20">Paste logs to begin a scan.</p>
                  </div>
                ) : (
                  list.data.investigations.map((inv, i) => {
                    const pending = ["queued", "running"].includes(inv.status);
                    const succeeded = inv.status === "succeeded";
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <Link href={`/app/radar/${inv.id}`} className="group block">
                          <div
                            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/15 p-3.5 transition duration-300 group-hover:border-red-400/20 group-hover:bg-white/[0.04]"
                            style={{ borderLeft: "2px solid rgba(248,113,113,0.22)" }}
                          >
                            {/* scan beam on succeeded */}
                            {succeeded && (
                              <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-[0.28]"
                                style={{
                                  background: "linear-gradient(to right,transparent,#f87171,transparent)",
                                  animation: "rd-scan-beam 3s ease-in-out infinite",
                                }}
                              />
                            )}

                            <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white">
                              {inv.title}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-foreground/35">
                              {inv.errorCount != null ? `${inv.errorCount} errors` : "—"}
                              {inv.totalLines != null ? ` · ${inv.totalLines} lines` : ""}
                              {inv.severity ? ` · ${inv.severity}` : ""}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-foreground/28">
                                {new Date(inv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                              <span
                                className={cn(
                                  "flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                  succeeded && "bg-red-400/15 text-red-300",
                                  inv.status === "failed" && "bg-white/8 text-foreground/40",
                                  pending && "animate-pulse bg-red-400/12 text-red-400/70",
                                )}
                              >
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </RadarFade>

        </div>
      </div>
    </>
  );
}
