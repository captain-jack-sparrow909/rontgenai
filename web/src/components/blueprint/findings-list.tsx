"use client";

import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { BlueprintFinding } from "@/lib/api";
import { cn } from "@/lib/utils";

const severityConfig: Record<
  string,
  {
    label: string;
    icon: typeof AlertTriangle;
    chip: string;
    border: string;
    glow: string;
    accent: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: AlertOctagon,
    chip: "bg-red-500/15 text-red-300 border-red-500/40",
    border: "border-red-500/25 hover:border-red-400/40",
    glow: "from-red-500/10",
    accent: "bg-red-400",
  },
  high: {
    label: "High",
    icon: ShieldAlert,
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    border: "border-orange-500/25 hover:border-orange-400/40",
    glow: "from-orange-500/10",
    accent: "bg-orange-400",
  },
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    border: "border-amber-500/20 hover:border-amber-400/35",
    glow: "from-amber-500/10",
    accent: "bg-amber-400",
  },
  low: {
    label: "Low",
    icon: Info,
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/35",
    border: "border-sky-500/20 hover:border-sky-400/35",
    glow: "from-sky-500/10",
    accent: "bg-sky-400",
  },
  info: {
    label: "Info",
    icon: Sparkles,
    chip: "bg-white/5 text-foreground/55 border-white/15",
    border: "border-white/10 hover:border-white/20",
    glow: "from-white/5",
    accent: "bg-white/40",
  },
};

export function FindingsList({ findings }: { findings: BlueprintFinding[] }) {
  if (!findings.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-foreground/45">
        No findings returned.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map((f, i) => {
        const cfg = severityConfig[f.severity] ?? severityConfig.info;
        const Icon = cfg.icon;
        return (
          <motion.li
            key={`${f.title}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-white/[0.025] p-4 transition duration-300",
              cfg.border,
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent opacity-60",
                cfg.glow,
              )}
            />
            <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-80">
              <div className={cn("h-full w-full rounded-full", cfg.accent)} />
            </div>
            <div className="relative pl-2">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    cfg.chip,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/40">
                  {f.category}
                </span>
                <span className="ml-auto font-mono text-[10px] text-foreground/25">
                  #{String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h4 className="text-[15px] font-semibold tracking-tight text-white">
                {f.title}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">
                {f.detail}
              </p>
              {f.recommendation ? (
                <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-cyan-100/85">
                    {f.recommendation}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
