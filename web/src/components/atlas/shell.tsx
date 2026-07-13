"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AtlasAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-28 top-0 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[120px]" />
      <div className="absolute -right-20 top-36 h-[340px] w-[340px] rounded-full bg-purple-600/20 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[240px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(167,139,250,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.08) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 15%, black 15%, transparent 75%)",
        }}
      />
    </div>
  );
}

export function AtlasGlass({
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
        glow && "shadow-violet-500/10 ring-1 ring-violet-400/20",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      {children}
    </div>
  );
}

export function AtlasLabel({
  children,
  index,
}: {
  children: ReactNode;
  index?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {index ? (
        <span className="font-mono text-[10px] tracking-widest text-violet-400/70">
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

export function AtlasFade({
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
