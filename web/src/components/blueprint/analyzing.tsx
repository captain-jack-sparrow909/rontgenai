"use client";

import { motion } from "framer-motion";
import { Activity, Network, Shield, Zap } from "lucide-react";
import { GlassPanel } from "./shell";

const steps = [
  { icon: Network, label: "Mapping topology" },
  { icon: Zap, label: "Stressing bottlenecks" },
  { icon: Shield, label: "Trust boundaries" },
  { icon: Activity, label: "Scoring dimensions" },
];

export function AnalyzingPanel() {
  return (
    <GlassPanel glow className="relative overflow-hidden p-8 sm:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="blueprint-radar absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20" />
        <div className="blueprint-radar-delay absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/15" />
        <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
          <div className="blueprint-scan-beam absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent" />
        </div>
      </div>

      <div className="relative flex flex-col items-center text-center">
        <motion.div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Activity className="h-6 w-6 text-cyan-300" />
        </motion.div>
        <h3 className="text-lg font-semibold tracking-tight text-white">
          Scanning architecture
        </h3>
        <p className="mt-2 max-w-md text-sm text-foreground/50">
          DeepSeek is x-raying scalability, reliability, security, and cost.
          Typically 15–60 seconds.
        </p>

        <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0.35 }}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 2,
                  delay: i * 0.35,
                  repeat: Infinity,
                }}
                className="rounded-xl border border-white/8 bg-black/20 px-2 py-3"
              >
                <Icon className="mx-auto mb-1.5 h-4 w-4 text-cyan-400/80" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                  {s.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}
