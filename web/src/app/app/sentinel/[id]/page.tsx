"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Info,
  LockKeyhole,
  Loader2,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  SentinelAtmosphere,
  SentinelFade,
  SentinelGlass,
  SentinelLabel,
} from "@/components/sentinel/shell";
import { Button } from "@/components/ui/button";
import { getSentinelReview, type SentinelFinding } from "@/lib/api";
import { cn } from "@/lib/utils";

const severityUi: Record<
  string,
  { icon: typeof AlertTriangle; chip: string; border: string }
> = {
  critical: {
    icon: AlertOctagon,
    chip: "bg-red-500/15 text-red-300 border-red-500/40",
    border: "border-red-500/25",
  },
  high: {
    icon: ShieldAlert,
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    border: "border-orange-500/25",
  },
  medium: {
    icon: AlertTriangle,
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    border: "border-amber-500/20",
  },
  low: {
    icon: Info,
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/35",
    border: "border-sky-500/20",
  },
  info: {
    icon: Info,
    chip: "bg-white/5 text-foreground/55 border-white/15",
    border: "border-white/10",
  },
};

export default function SentinelReviewPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["sentinel-review", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getSentinelReview(token, id);
    },
    refetchInterval: (q) => {
      const status = q.state.data?.review.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const review = query.data?.review;
  const payload = review?.result?.review;
  const pending =
    review?.status === "queued" || review?.status === "running";

  return (
    <div className="relative mx-auto max-w-3xl">
      <SentinelAtmosphere />

      <SentinelFade>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/sentinel">
              <ArrowLeft className="h-4 w-4" />
              All reviews
            </Link>
          </Button>
          {review?.result?.github?.htmlUrl ? (
            <Button asChild variant="secondary" size="sm">
              <a
                href={review.result.github.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </SentinelFade>

      {query.isLoading ? (
        <SentinelGlass className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          <span className="text-sm text-foreground/50">Loading review…</span>
        </SentinelGlass>
      ) : query.isError ? (
        <SentinelGlass className="p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load"}
        </SentinelGlass>
      ) : review ? (
        <div className="space-y-6">
          <SentinelFade delay={0.05}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950">
                <Shield className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusChip status={review.status} />
                  {payload?.verdict ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-amber-200/80">
                      {payload.verdict}
                    </span>
                  ) : null}
                  {review.reviewFocus === "security" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase text-amber-200/75">
                      <LockKeyhole className="h-3 w-3" /> Security focus
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  {review.title || "PR review"}
                </h1>
                {review.prUrl ? (
                  <a
                    href={String(review.prUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300/80 hover:text-amber-200"
                  >
                    {String(review.prUrl)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </SentinelFade>

          {pending ? (
            <SentinelGlass glow className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Scanning pull request…
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  Fetching diff and running DeepSeek review
                </p>
              </div>
            </SentinelGlass>
          ) : null}

          {review.status === "failed" ? (
            <SentinelGlass className="border-red-500/30 p-6">
              <p className="text-sm text-red-300">
                {review.error || "Review failed"}
              </p>
            </SentinelGlass>
          ) : null}

          {payload ? (
            <>
              <SentinelFade delay={0.1}>
                <SentinelLabel index="SM">Summary</SentinelLabel>
                <SentinelGlass glow className="p-5">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {payload.summary}
                  </p>
                  {review.result?.meta?.model ? (
                    <p className="mt-3 font-mono text-[10px] text-foreground/35">
                      {review.result.meta.model}
                      {review.result.meta.filesReviewed != null
                        ? ` · ${review.result.meta.filesReviewed} files`
                        : null}
                    </p>
                  ) : null}
                  {review.result?.postError ? (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Posted with fallback: {review.result.postError}
                    </p>
                  ) : null}
                </SentinelGlass>
              </SentinelFade>

              {payload.security_posture ? (
                <SentinelFade delay={0.11}>
                  <SentinelLabel index="SP">Security posture</SentinelLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["Attack surface", payload.security_posture.attack_surface],
                      ["Trust boundaries", payload.security_posture.trust_boundaries],
                      ["Sensitive assets", payload.security_posture.sensitive_assets],
                      ["Residual risks", payload.security_posture.residual_risks],
                    ] as const).map(([label, items]) => (
                      <SentinelGlass key={label} className="p-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300/65">{label}</p>
                        {items.length ? (
                          <ul className="space-y-1.5">
                            {items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-xs leading-relaxed text-foreground/60"><Crosshair className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/60" />{item}</li>)}
                          </ul>
                        ) : <p className="text-xs text-foreground/30">No evidence in this diff.</p>}
                      </SentinelGlass>
                    ))}
                  </div>
                </SentinelFade>
              ) : null}

              {payload.positives?.length ? (
                <SentinelFade delay={0.12}>
                  <SentinelLabel index="OK">Positives</SentinelLabel>
                  <SentinelGlass className="space-y-2 p-4">
                    {payload.positives.map((p) => (
                      <div
                        key={p}
                        className="flex gap-2 text-sm text-foreground/70"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                        {p}
                      </div>
                    ))}
                  </SentinelGlass>
                </SentinelFade>
              ) : null}

              <SentinelFade delay={0.15}>
                <SentinelLabel index="FD">
                  Findings · {payload.findings.length}
                </SentinelLabel>
                <Findings findings={payload.findings} />
              </SentinelFade>

              {review.files?.length ? (
                <SentinelFade delay={0.18}>
                  <SentinelLabel index="FL">Files reviewed</SentinelLabel>
                  <SentinelGlass className="max-h-48 overflow-y-auto p-3">
                    <ul className="space-y-1">
                      {review.files.map((f) => (
                        <li
                          key={f.path}
                          className="flex justify-between gap-2 font-mono text-[11px] text-foreground/55"
                        >
                          <span className="truncate">{f.path}</span>
                          <span className="shrink-0 text-foreground/35">
                            +{f.additions}/-{f.deletions}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SentinelGlass>
                </SentinelFade>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        status === "succeeded" &&
          "border-amber-400/30 bg-amber-400/10 text-amber-300",
        status === "failed" && "border-red-400/30 bg-red-400/10 text-red-300",
        (status === "queued" || status === "running") &&
          "border-amber-400/30 bg-amber-400/10 text-amber-300",
      )}
    >
      {status}
    </span>
  );
}

function Findings({ findings }: { findings: SentinelFinding[] }) {
  if (!findings.length) {
    return (
      <SentinelGlass className="px-4 py-8 text-center text-sm text-foreground/45">
        No findings — looking clean.
      </SentinelGlass>
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map((f, i) => {
        const ui = severityUi[f.severity] ?? severityUi.info;
        const Icon = ui.icon;
        return (
          <motion.li
            key={`${f.path}-${f.title}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i }}
            className={cn(
              "rounded-2xl border bg-white/[0.025] p-4",
              ui.border,
            )}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  ui.chip,
                )}
              >
                <Icon className="h-3 w-3" />
                {f.severity}
              </span>
              <span className="font-mono text-[10px] text-foreground/40">
                {f.path}
                {f.line != null ? `:${f.line}` : ""}
              </span>
              {f.cwe ? <span className="rounded border border-amber-400/20 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-amber-200/65">{f.cwe}</span> : null}
              {f.category ? <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase text-foreground/45">{f.category}</span> : null}
              {f.exploitability ? <span className="rounded border border-red-400/15 bg-red-400/[0.04] px-1.5 py-0.5 text-[9px] uppercase text-red-200/60">{f.exploitability} exploitability</span> : null}
            </div>
            <h4 className="text-sm font-semibold text-white">{f.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
              {f.body}
            </p>
            {f.attack_scenario ? (
              <div className="mt-3 rounded-lg border border-red-400/15 bg-red-400/[0.04] px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-red-300/65">Attack scenario</p>
                <p className="mt-1 text-xs leading-relaxed text-red-100/65">{f.attack_scenario}</p>
              </div>
            ) : null}
            {f.evidence?.length ? (
              <ul className="mt-3 space-y-1">
                {f.evidence.map((evidence, index) => <li key={`${index}-${evidence}`} className="flex gap-2 text-xs text-foreground/50"><Crosshair className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/55" />{evidence}</li>)}
              </ul>
            ) : null}
            {f.suggestion ? (
              <p className="mt-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-100/85">
                💡 {f.suggestion}
              </p>
            ) : null}
          </motion.li>
        );
      })}
    </ul>
  );
}
