"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ambient x-ray grid + cyan glow backdrop for Blueprint. */
export function BlueprintAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="absolute -right-20 top-40 h-[360px] w-[360px] rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full bg-violet-600/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 20%, black 10%, transparent 75%)",
        }}
      />
      <div className="blueprint-scanline absolute inset-x-0 top-0 h-32 opacity-30" />
    </div>
  );
}

export function GlassPanel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-xl",
        glow && "shadow-cyan-500/10 ring-1 ring-cyan-400/20",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  index,
}: {
  children: ReactNode;
  index?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {index ? (
        <span className="font-mono text-[10px] tracking-widest text-cyan-400/70">
          {index}
        </span>
      ) : null}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
