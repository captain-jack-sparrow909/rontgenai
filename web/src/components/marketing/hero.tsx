"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroCta } from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[780px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge className="mb-6 gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            See through your systems
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            AI that reviews your{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              architecture, code &amp; incidents
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-foreground/65 sm:text-lg">
            Röntgen AI is a suite of focused tools for engineers — diagram
            reviews, repo maps, data chat, PR reviews, issue solvers, and
            production RCA. Built for clarity, not chat noise.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <HeroCta />
            <p className="flex items-center gap-1 text-xs text-foreground/45">
              Free tier available · No credit card required
              <ArrowRight className="h-3 w-3" />
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 shadow-2xl shadow-cyan-950/40">
            <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0a0f1a]">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-foreground/40">
                  blueprint · architecture review
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-white/5 p-5 md:border-b-0 md:border-r">
                  <p className="mb-3 text-[11px] uppercase tracking-wider text-foreground/40">
                    Input
                  </p>
                  <div className="space-y-2 font-mono text-[11px] leading-relaxed text-cyan-200/80">
                    <p>┌─ API Gateway ──┐</p>
                    <p>│  Auth · Rate   │</p>
                    <p>└───────┬────────┘</p>
                    <p>   ┌────┴────┐</p>
                    <p>   ▼         ▼</p>
                    <p>Services   Postgres</p>
                    <p className="text-amber-300/70">⚠ single region · no queue</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-3 text-[11px] uppercase tracking-wider text-foreground/40">
                    Review
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      <span>
                        <span className="font-medium text-red-300">High</span>
                        <span className="text-foreground/60">
                          {" "}
                          — DB is a single point of failure under write load
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>
                        <span className="font-medium text-amber-300">Medium</span>
                        <span className="text-foreground/60">
                          {" "}
                          — No async boundary for bursty AI jobs
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>
                        <span className="font-medium text-emerald-300">Tradeoff</span>
                        <span className="text-foreground/60">
                          {" "}
                          — Add queue before multi-region
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
