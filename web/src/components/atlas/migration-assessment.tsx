"use client";

import { ArrowRight, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import type { AtlasMigrationAssessment, AtlasMigrationRequest } from "@/lib/api";
import { AtlasFade, AtlasGlass, AtlasLabel } from "@/components/atlas/shell";
import { MermaidDiagram } from "@/components/atlas/mermaid-diagram";
import { cn } from "@/lib/utils";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-relaxed text-foreground/65">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400/70" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function MigrationAssessment({
  assessment,
  request,
}: {
  assessment: AtlasMigrationAssessment;
  request: AtlasMigrationRequest | null;
}) {
  return (
    <div className="space-y-6">
      <AtlasFade delay={0.05}>
        <AtlasLabel index="01">Migration brief</AtlasLabel>
        <AtlasGlass glow className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
              Target · {assessment.target_state.target}
            </span>
            {request?.deadline ? (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-foreground/50">
                Deadline input · {request.deadline}
              </span>
            ) : null}
          </div>
          <p className="text-base leading-relaxed text-foreground/80">
            {assessment.executive_summary}
          </p>
          {request?.constraints ? (
            <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-relaxed text-amber-100/65">
              <span className="font-semibold text-amber-200/80">Planning constraints: </span>
              {request.constraints}
            </div>
          ) : null}
        </AtlasGlass>
      </AtlasFade>

      <div className="grid gap-4 md:grid-cols-2">
        <AtlasGlass className="p-5">
          <AtlasLabel index="CS">Current state</AtlasLabel>
          <p className="text-sm leading-relaxed text-foreground/65">
            {assessment.current_state.summary}
          </p>
          {assessment.current_state.blockers.length ? (
            <div className="mt-4">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-amber-300/65">Blockers</p>
              <BulletList items={assessment.current_state.blockers} />
            </div>
          ) : null}
        </AtlasGlass>
        <AtlasGlass className="p-5">
          <AtlasLabel index="TS">Target state</AtlasLabel>
          <p className="text-sm leading-relaxed text-foreground/65">
            {assessment.target_state.architecture}
          </p>
          {assessment.target_state.tradeoffs.length ? (
            <div className="mt-4">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-violet-300/65">Tradeoffs</p>
              <BulletList items={assessment.target_state.tradeoffs} />
            </div>
          ) : null}
        </AtlasGlass>
      </div>

      {assessment.diagrams.length ? (
        <AtlasFade delay={0.1}>
          <AtlasLabel index="02">Current → target architecture</AtlasLabel>
          <div className="grid gap-4 xl:grid-cols-2">
            {assessment.diagrams.map((diagram) => (
              <AtlasGlass key={`${diagram.stage}-${diagram.title}`} className="overflow-hidden">
                <div className="border-b border-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{diagram.title}</p>
                    <span className="rounded-full border border-violet-400/20 px-2 py-0.5 text-[9px] uppercase text-violet-200/60">
                      {diagram.stage}
                    </span>
                  </div>
                  {diagram.description ? <p className="mt-1 text-xs text-foreground/45">{diagram.description}</p> : null}
                </div>
                <MermaidDiagram code={diagram.mermaid} label={diagram.title} />
              </AtlasGlass>
            ))}
          </div>
        </AtlasFade>
      ) : null}

      <AtlasFade delay={0.12}>
        <AtlasLabel index="03">Staged migration plan</AtlasLabel>
        <div className="space-y-3">
          {assessment.phases.map((phase, index) => (
            <AtlasGlass key={`${index}-${phase.name}`} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/12 font-mono text-xs text-violet-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-medium text-white">{phase.name}</h3>
                    <p className="mt-1 text-sm text-foreground/55">{phase.objective}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase text-foreground/45">{phase.effort} effort</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] uppercase", phase.risk === "high" ? "border-rose-400/25 text-rose-300/70" : phase.risk === "low" ? "border-emerald-400/25 text-emerald-300/70" : "border-amber-400/25 text-amber-300/70")}>{phase.risk} risk</span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-foreground/35">Changes</p><BulletList items={phase.changes} /></div>
                <div><p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-foreground/35">Validation gates</p><BulletList items={phase.validation} /></div>
              </div>
              <div className="mt-4 flex gap-2 rounded-lg border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-foreground/50">
                <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300/70" />
                <span><strong className="text-foreground/65">Rollback:</strong> {phase.rollback}</span>
              </div>
            </AtlasGlass>
          ))}
        </div>
      </AtlasFade>

      {assessment.compatibility_bridges.length ? (
        <div>
          <AtlasLabel index="04">Compatibility bridges</AtlasLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {assessment.compatibility_bridges.map((bridge, index) => (
              <AtlasGlass key={`${index}-${bridge.from}`} className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <span>{bridge.from}</span><ArrowRight className="h-3.5 w-3.5 text-violet-400" /><span>{bridge.to}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/55">{bridge.strategy}</p>
                <p className="mt-3 text-[10px] text-violet-200/55">Removal gate · {bridge.removal_gate}</p>
              </AtlasGlass>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div><AtlasLabel index="QA">Testing strategy</AtlasLabel><AtlasGlass className="p-4"><BulletList items={assessment.testing_strategy} /></AtlasGlass></div>
        <div><AtlasLabel index="RO">Rollout strategy</AtlasLabel><AtlasGlass className="p-4"><BulletList items={assessment.rollout_strategy} /></AtlasGlass></div>
      </div>

      {assessment.risk_register.length ? (
        <div>
          <AtlasLabel index="RK">Risk register</AtlasLabel>
          <AtlasGlass className="divide-y divide-white/5 overflow-hidden">
            {assessment.risk_register.map((item, index) => (
              <div key={`${index}-${item.risk}`} className="flex gap-3 p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
                <div><p className="text-sm font-medium text-white/85">{item.risk}</p><p className="mt-1 text-xs text-foreground/50">{item.impact}</p><p className="mt-2 text-xs text-violet-200/60">Mitigation · {item.mitigation}</p></div>
              </div>
            ))}
          </AtlasGlass>
        </div>
      ) : null}
    </div>
  );
}
