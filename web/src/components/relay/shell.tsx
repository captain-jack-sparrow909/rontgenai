"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RelayAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-32 top-0 h-[430px] w-[430px] rounded-full bg-indigo-500/15 blur-[125px]" />
      <div className="absolute -right-24 top-52 h-[380px] w-[380px] rounded-full bg-blue-600/15 blur-[110px]" />
      <div className="absolute bottom-0 left-[38%] h-[260px] w-[460px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(129,140,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 82% 72% at 50% 18%, black 8%, transparent 76%)",
        }}
      />
    </div>
  );
}

export function RelayGlass({
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
        "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.065] to-white/[0.018] shadow-2xl shadow-black/35 backdrop-blur-xl",
        glow && "shadow-indigo-500/10 ring-1 ring-indigo-400/20",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/55 to-transparent" />
      {children}
    </div>
  );
}

export function RelayFade({
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
