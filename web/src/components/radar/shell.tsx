"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RadarAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-0 h-[400px] w-[400px] rounded-full bg-red-500/15 blur-[120px]" />
      <div className="absolute -right-16 top-36 h-[320px] w-[320px] rounded-full bg-rose-600/15 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[240px] w-[400px] rounded-full bg-orange-600/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,113,113,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(248,113,113,0.08) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 15%, black 15%, transparent 75%)",
        }}
      />
    </div>
  );
}

export function RadarGlass({
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
        glow && "shadow-red-500/10 ring-1 ring-red-400/20",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
      {children}
    </div>
  );
}

export function RadarLabel({
  children,
  index,
}: {
  children: ReactNode;
  index?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {index ? (
        <span className="font-mono text-[10px] tracking-widest text-red-400/70">
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

export function RadarFade({
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
