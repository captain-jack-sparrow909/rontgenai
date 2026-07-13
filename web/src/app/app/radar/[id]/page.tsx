"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckSquare,
  ClipboardCopy,
  Crosshair,
  Loader2,
  Radar as RadarIcon,
  Siren,
  Zap,
} from "lucide-react";
import {
  RadarAtmosphere,
  RadarFade,
  RadarGlass,
  RadarLabel,
} from "@/components/radar/shell";
import { Button } from "@/components/ui/button";
import { getRadarInvestigation, type RadarCause } from "@/lib/api";
import { cn } from "@/lib/utils";

const severityStyle: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-300",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  low: "border-sky-500/35 bg-sky-500/10 text-sky-300",
};

export default function RadarDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["radar-investigation", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getRadarInvestigation(token, id);
    },
    refetchInterval: (q) => {
      const status = q.state.data?.investigation.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const inv = query.data?.investigation;
  const report = inv?.result?.report;
  const pending = inv?.status === "queued" || inv?.status === "running";

  async function copyPostmortem() {
    if (!report) return;
    const pm = report.postmortem_draft;
    const md = [
      `# Postmortem: ${inv?.title ?? "Incident"}`,
      "",
      `## Impact\n${pm.impact}`,
      "",
      `## Detection\n${pm.detection}`,
      "",
      `## Root cause\n${pm.root_cause}`,
      "",
      `## Resolution\n${pm.resolution}`,
      "",
      "## Lessons",
      ...pm.lessons.map((l) => `- ${l}`),
      "",
      "## Immediate actions",
      ...report.immediate_actions.map((a) => `- ${a}`),
    ].join("\n");
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative mx-auto max-w-4xl">
      <RadarAtmosphere />

      <RadarFade>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/radar">
              <ArrowLeft className="h-4 w-4" />
              All investigations
            </Link>
          </Button>
          {report ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copyPostmortem()}
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy postmortem"}
            </Button>
          ) : null}
        </div>
      </RadarFade>

      {query.isLoading ? (
        <RadarGlass className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-red-400" />
          <span className="text-sm text-foreground/50">Loading…</span>
        </RadarGlass>
      ) : query.isError ? (
        <RadarGlass className="p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load"}
        </RadarGlass>
      ) : inv ? (
        <div className="space-y-6">
          <RadarFade delay={0.05}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-rose-500 text-slate-950">
                <RadarIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      inv.status === "succeeded" &&
                        "border-red-400/30 bg-red-400/10 text-red-300",
                      inv.status === "failed" &&
                        "border-white/15 bg-white/5 text-foreground/50",
                      pending &&
                        "animate-pulse border-red-400/30 bg-red-400/10 text-red-300",
                    )}
                  >
                    {inv.status}
                  </span>
                  {report?.severity ? (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        severityStyle[report.severity],
                      )}
                    >
                      {report.severity}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {inv.title || "Investigation"}
                </h1>
                {inv.signals ? (
                  <p className="mt-1 text-xs text-foreground/40">
                    {inv.signals.errorCount ?? 0} errors ·{" "}
                    {inv.signals.warnCount ?? 0} warns ·{" "}
                    {inv.signals.totalLines ?? 0} lines
                    {inv.signals.timeRange?.first
                      ? ` · ${inv.signals.timeRange.first}`
                      : ""}
                    {inv.signals.timeRange?.last
                      ? ` → ${inv.signals.timeRange.last}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </RadarFade>

          {pending ? (
            <RadarGlass glow className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-red-400/20" />
                <Loader2 className="relative h-8 w-8 animate-spin text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Sweeping signals…
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  Correlating errors and ranking root causes
                </p>
              </div>
            </RadarGlass>
          ) : null}

          {inv.status === "failed" ? (
            <RadarGlass className="border-red-500/30 p-6">
              <p className="text-sm text-red-300">
                {inv.error || "Investigation failed"}
              </p>
            </RadarGlass>
          ) : null}

          {inv.signals?.topErrorSignatures?.length ? (
            <RadarFade delay={0.08}>
              <RadarLabel index="SG">Top error signatures</RadarLabel>
              <RadarGlass className="space-y-2 p-4">
                {inv.signals.topErrorSignatures.slice(0, 6).map((s) => (
                  <div
                    key={s.signature}
                    className="flex justify-between gap-3 font-mono text-[11px]"
                  >
                    <span className="truncate text-red-100/70">
                      {s.signature}
                    </span>
                    <span className="shrink-0 text-foreground/40">
                      ×{s.count}
                    </span>
                  </div>
                ))}
              </RadarGlass>
            </RadarFade>
          ) : null}

          {report ? (
            <>
              <RadarFade delay={0.1}>
                <RadarLabel index="01">Incident summary</RadarLabel>
                <RadarGlass glow className="p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2 text-red-300/80">
                    <Siren className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Executive brief
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-foreground/85">
                    {report.incident_summary}
                  </p>
                  <p className="mt-4 text-sm text-foreground/55">
                    <span className="text-foreground/40">Blast radius: </span>
                    {report.blast_radius}
                  </p>
                  {inv.result?.meta?.model ? (
                    <p className="mt-3 font-mono text-[10px] text-foreground/30">
                      {inv.result.meta.model}
                    </p>
                  ) : null}
                </RadarGlass>
              </RadarFade>

              {report.timeline?.length ? (
                <RadarFade delay={0.12}>
                  <RadarLabel index="02">Timeline</RadarLabel>
                  <RadarGlass className="p-5">
                    <ol className="relative space-y-4 border-l border-red-400/20 pl-5">
                      {report.timeline.map((t, i) => (
                        <li key={`${t.event}-${i}`} className="relative">
                          <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]" />
                          {t.time ? (
                            <p className="font-mono text-[10px] text-red-300/60">
                              {t.time}
                            </p>
                          ) : null}
                          <p className="text-sm text-foreground/75">{t.event}</p>
                        </li>
                      ))}
                    </ol>
                  </RadarGlass>
                </RadarFade>
              ) : null}

              <RadarFade delay={0.14}>
                <RadarLabel index="03">
                  Likely causes · {report.likely_causes.length}
                </RadarLabel>
                <div className="space-y-3">
                  {report.likely_causes.map((c, i) => (
                    <CauseCard key={c.title} cause={c} index={i} />
                  ))}
                </div>
              </RadarFade>

              <div className="grid gap-4 lg:grid-cols-2">
                <RadarFade delay={0.16}>
                  <RadarLabel index="04">Immediate actions</RadarLabel>
                  <RadarGlass className="space-y-2 p-4">
                    {report.immediate_actions.map((a) => (
                      <div
                        key={a}
                        className="flex gap-2 text-sm text-foreground/70"
                      >
                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/80" />
                        {a}
                      </div>
                    ))}
                  </RadarGlass>
                </RadarFade>
                <RadarFade delay={0.18}>
                  <RadarLabel index="05">Checklist</RadarLabel>
                  <RadarGlass className="space-y-2 p-4">
                    {report.investigation_checklist.map((c) => (
                      <div
                        key={c}
                        className="flex gap-2 text-sm text-foreground/70"
                      >
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-red-300/80" />
                        {c}
                      </div>
                    ))}
                  </RadarGlass>
                </RadarFade>
              </div>

              <RadarFade delay={0.2}>
                <RadarLabel index="PM">Postmortem draft</RadarLabel>
                <RadarGlass className="space-y-4 p-5">
                  {(
                    [
                      ["Impact", report.postmortem_draft.impact],
                      ["Detection", report.postmortem_draft.detection],
                      ["Root cause", report.postmortem_draft.root_cause],
                      ["Resolution", report.postmortem_draft.resolution],
                    ] as const
                  ).map(([label, text]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300/70">
                        {label}
                      </p>
                      <p className="mt-1 text-sm text-foreground/70">{text}</p>
                    </div>
                  ))}
                  {report.postmortem_draft.lessons?.length ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300/70">
                        Lessons
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-foreground/65">
                        {report.postmortem_draft.lessons.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </RadarGlass>
              </RadarFade>

              {inv.logExcerpt ? (
                <RadarFade delay={0.22}>
                  <RadarLabel index="LG">Log excerpt</RadarLabel>
                  <RadarGlass className="overflow-hidden">
                    <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-red-100/60">
                      {inv.logExcerpt}
                    </pre>
                  </RadarGlass>
                </RadarFade>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CauseCard({ cause, index }: { cause: RadarCause; index: number }) {
  const pct = Math.round(cause.confidence * 100);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <RadarGlass className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/15 font-mono text-xs text-red-300">
            #{cause.rank}
          </span>
          <h3 className="text-sm font-semibold text-white">{cause.title}</h3>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-foreground/40">
            {cause.category}
          </span>
          <span className="ml-auto font-mono text-xs text-red-300/80">
            {pct}%
          </span>
        </div>
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: 0.1 * index }}
          />
        </div>
        {cause.evidence?.length ? (
          <ul className="mb-3 space-y-1">
            {cause.evidence.map((e) => (
              <li
                key={e}
                className="flex gap-2 text-xs text-foreground/55"
              >
                <Crosshair className="mt-0.5 h-3 w-3 shrink-0 text-red-400/60" />
                {e}
              </li>
            ))}
          </ul>
        ) : null}
        {cause.remediation?.length ? (
          <div className="rounded-xl border border-red-400/15 bg-red-400/[0.05] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300/70">
              Remediation
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-red-100/75">
              {cause.remediation.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </RadarGlass>
    </motion.div>
  );
}
