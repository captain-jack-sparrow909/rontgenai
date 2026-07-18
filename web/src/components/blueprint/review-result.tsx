"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Cpu,
  GitBranch,
  ListOrdered,
  Scale,
  TriangleAlert,
} from "lucide-react";
import type { BlueprintReviewPayload } from "@/lib/api";
import { FindingsList } from "./findings-list";
import { ScoreRing } from "./score-ring";
import { GlassPanel, SectionLabel } from "./shell";

export function ReviewResult({
  review,
  meta,
}: {
  review: BlueprintReviewPayload;
  meta?: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    completedAt?: string;
  };
}) {
  return (
    <div className="space-y-8">
      {/* Hero summary + overall score */}
      <GlassPanel glow className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
          <div className="shrink-0">
            <ScoreRing
              label="Overall"
              value={review.scores.overall}
              size={140}
              emphasize
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Executive brief
              </span>
              {meta?.model ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-foreground/35">
                  <Cpu className="h-3 w-3" />
                  {meta.model}
                  {meta.promptTokens != null
                    ? ` · ${meta.promptTokens + (meta.completionTokens ?? 0)} tok`
                    : null}
                </span>
              ) : null}
            </div>
            <p className="text-base leading-relaxed text-foreground/80 sm:text-lg">
              {review.summary}
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Dimension scores */}
      <div>
        <SectionLabel index="01">Signal scores</SectionLabel>
        <GlassPanel className="p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <ScoreRing
              label="Scale"
              value={review.scores.scalability}
              delay={0.05}
            />
            <ScoreRing
              label="Reliability"
              value={review.scores.reliability}
              delay={0.12}
            />
            <ScoreRing
              label="Security"
              value={review.scores.security}
              delay={0.19}
            />
            <ScoreRing
              label="Cost"
              value={review.scores.cost_efficiency}
              delay={0.26}
            />
          </div>
        </GlassPanel>
      </div>

      {review.cost_analysis ? (
        <div>
          <SectionLabel index="COST">Cloud cost opportunities</SectionLabel>
          <div className="space-y-4">
            <GlassPanel glow className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="mb-2 flex items-center gap-2 text-cyan-300/75"><Coins className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Evidence baseline</span></div><p className="max-w-2xl text-sm leading-relaxed text-foreground/65">{review.cost_analysis.baseline}</p></div>
                {review.cost_analysis.total_monthly_savings_low != null && review.cost_analysis.total_monthly_savings_high != null ? (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-right"><p className="text-[9px] uppercase tracking-wider text-emerald-300/60">Estimated monthly range</p><p className="mt-1 font-mono text-lg font-semibold text-emerald-200">{review.cost_analysis.currency ?? ""} {review.cost_analysis.total_monthly_savings_low.toLocaleString()}–{review.cost_analysis.total_monthly_savings_high.toLocaleString()}</p></div>
                ) : <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-foreground/40">Savings not estimated without pricing evidence</span>}
              </div>
            </GlassPanel>

            <div className="space-y-3">
              {review.cost_analysis.opportunities.map((opportunity, index) => (
                <GlassPanel key={`${index}-${opportunity.resource}`} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white/85">{opportunity.resource}</h3><span className="rounded border border-cyan-400/15 bg-cyan-400/[0.05] px-1.5 py-0.5 text-[9px] uppercase text-cyan-200/60">{opportunity.category}</span></div><p className="mt-2 text-sm leading-relaxed text-foreground/60">{opportunity.recommendation}</p></div><div className="flex gap-1.5"><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase text-foreground/45">{opportunity.confidence} confidence</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase text-foreground/45">{opportunity.risk} risk</span></div></div>
                  {opportunity.monthly_savings_low != null && opportunity.monthly_savings_high != null ? <p className="mt-3 font-mono text-xs text-emerald-300/70">Potential: {review.cost_analysis?.currency ?? ""} {opportunity.monthly_savings_low.toLocaleString()}–{opportunity.monthly_savings_high.toLocaleString()} / month</p> : null}
                  {opportunity.evidence.length ? <ul className="mt-3 space-y-1">{opportunity.evidence.map((evidence, evidenceIndex) => <li key={`${evidenceIndex}-${evidence}`} className="flex gap-2 text-xs text-foreground/45"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400/55" />{evidence}</li>)}</ul> : null}
                  <p className="mt-3 rounded-lg border border-white/5 bg-black/15 p-3 text-xs text-foreground/50"><strong className="text-foreground/65">Validate before changing:</strong> {opportunity.validation}</p>
                </GlassPanel>
              ))}
            </div>

            {review.cost_analysis.anomalies.length ? <GlassPanel className="p-4"><div className="mb-2 flex items-center gap-2 text-amber-300/70"><TriangleAlert className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-wider">Cost anomalies</p></div><ul className="space-y-1.5 text-sm text-foreground/60">{review.cost_analysis.anomalies.map((item, index) => <li key={`${index}-${item}`}>• {item}</li>)}</ul></GlassPanel> : null}

            {review.cost_analysis.quick_wins.length || review.cost_analysis.assumptions.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {review.cost_analysis.quick_wins.length ? (
                  <GlassPanel className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-emerald-300/70"><CheckCircle2 className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-wider">Quick wins</p></div>
                    <ul className="space-y-2">{review.cost_analysis.quick_wins.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-relaxed text-foreground/60">{index + 1}. {item}</li>)}</ul>
                  </GlassPanel>
                ) : null}
                {review.cost_analysis.assumptions.length ? (
                  <GlassPanel className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-amber-300/70"><TriangleAlert className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-wider">Assumptions to verify</p></div>
                    <ul className="space-y-2">{review.cost_analysis.assumptions.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-relaxed text-foreground/55">• {item}</li>)}</ul>
                  </GlassPanel>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Findings */}
      <div>
        <SectionLabel index="02">
          Findings · {review.findings.length}
        </SectionLabel>
        <FindingsList findings={review.findings} />
      </div>

      {/* Tradeoffs + next steps */}
      <div className="grid gap-4 lg:grid-cols-2">
        {review.tradeoffs?.length ? (
          <div>
            <SectionLabel index="03">Tradeoffs</SectionLabel>
            <GlassPanel className="h-full p-5">
              <div className="mb-3 flex items-center gap-2 text-violet-300/80">
                <Scale className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Design tension
                </span>
              </div>
              <ul className="space-y-3">
                {review.tradeoffs.map((t, i) => (
                  <motion.li
                    key={t}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-2.5 text-sm leading-relaxed text-foreground/70"
                  >
                    <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400/70" />
                    {t}
                  </motion.li>
                ))}
              </ul>
            </GlassPanel>
          </div>
        ) : null}

        {review.next_steps?.length ? (
          <div>
            <SectionLabel index="04">Next steps</SectionLabel>
            <GlassPanel className="h-full p-5">
              <div className="mb-3 flex items-center gap-2 text-cyan-300/80">
                <ListOrdered className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Priority actions
                </span>
              </div>
              <ol className="space-y-3">
                {review.next_steps.map((s, i) => (
                  <motion.li
                    key={s}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-3 text-sm leading-relaxed text-foreground/75"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 font-mono text-[11px] text-cyan-300">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </motion.li>
                ))}
              </ol>
            </GlassPanel>
          </div>
        ) : null}
      </div>

      {review.architecture_notes ? (
        <div>
          <SectionLabel index="05">Architecture notes</SectionLabel>
          <GlassPanel className="p-5">
            <p className="text-sm leading-relaxed text-foreground/70">
              {review.architecture_notes}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-cyan-400/60">
              <ArrowRight className="h-3 w-3" />
              Structural interpretation from Blueprint
            </div>
          </GlassPanel>
        </div>
      ) : null}
    </div>
  );
}
