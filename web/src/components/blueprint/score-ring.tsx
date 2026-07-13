"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function scoreColor(value: number) {
  if (value >= 8) return { stroke: "#34d399", text: "text-emerald-300", glow: "drop-shadow-[0_0_12px_rgba(52,211,153,0.45)]" };
  if (value >= 5) return { stroke: "#fbbf24", text: "text-amber-300", glow: "drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]" };
  return { stroke: "#f87171", text: "text-red-300", glow: "drop-shadow-[0_0_12px_rgba(248,113,113,0.4)]" };
}

export function ScoreRing({
  label,
  value,
  size = 104,
  delay = 0,
  emphasize,
}: {
  label: string;
  value: number;
  size?: number;
  delay?: number;
  emphasize?: boolean;
}) {
  const stroke = emphasize ? 7 : 5;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(10, Math.max(0, value)) / 10;
  const colors = scoreColor(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", colors.glow)} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn(
              "font-semibold tabular-nums tracking-tight",
              emphasize ? "text-2xl" : "text-lg",
              colors.text,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {value}
          </motion.span>
          <span className="text-[9px] uppercase tracking-wider text-foreground/35">
            / 10
          </span>
        </div>
      </div>
      <span className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/55">
        {label}
      </span>
    </div>
  );
}

/** Compact inline bar for history cards */
export function MiniScore({ value }: { value: number }) {
  const colors = scoreColor(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: colors.stroke }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className={cn("font-mono text-xs tabular-nums", colors.text)}>
        {value}
      </span>
    </div>
  );
}
