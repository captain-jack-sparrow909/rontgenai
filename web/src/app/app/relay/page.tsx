"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCode2,
  FileUp,
  Gauge,
  GitBranch,
  Loader2,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TimerReset,
  Workflow,
  Zap,
} from "lucide-react";
import { RelayAtmosphere, RelayFade, RelayGlass } from "@/components/relay/shell";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { createRelayAnalysis, listRelayAnalyses } from "@/lib/api";

const fieldClass =
  "w-full rounded-xl border border-white/[0.08] bg-[#070914]/80 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-foreground/20 hover:border-white/[0.12] focus:border-indigo-400/45 focus:ring-2 focus:ring-indigo-400/10";

const CAPABILITIES = [
  "Critical paths",
  "Cache misses",
  "Flaky tests",
  "Duplicate work",
  "Runner waste",
  "Parallelization",
];

const PIPELINE_SIGNALS = [
  { label: "Workflow", value: "YAML", icon: GitBranch },
  { label: "Timings", value: "Steps", icon: Clock3 },
  { label: "Caching", value: "Hits", icon: Boxes },
  { label: "Retries", value: "Tests", icon: TestTube2 },
];

function ReticleCorners() {
  return (
    <>
      <span className="absolute left-3 top-3 h-4 w-4 border-l border-t border-indigo-300/30" />
      <span className="absolute right-3 top-3 h-4 w-4 border-r border-t border-indigo-300/30" />
      <span className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-indigo-300/30" />
      <span className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-indigo-300/30" />
    </>
  );
}

function PipelinePreview() {
  const nodes = [
    { label: "BUILD", detail: "3m 42s", dot: "bg-indigo-400", ring: "bg-indigo-400/10" },
    { label: "TEST", detail: "8m 16s", dot: "bg-blue-400", ring: "bg-blue-400/10" },
    { label: "SHIP", detail: "1m 08s", dot: "bg-cyan-400", ring: "bg-cyan-400/10" },
  ];

  return (
    <div className="relative mx-auto h-[190px] w-full max-w-[360px]">
      <div className="absolute inset-0 rounded-[28px] border border-indigo-300/[0.08] bg-[#050712]/55 [transform:perspective(600px)_rotateX(7deg)_rotateY(-5deg)]" />
      <div className="absolute inset-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a16]/90 p-4 shadow-2xl shadow-indigo-950/70">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-indigo-300/45">run #1842</span>
        </div>

        <div className="relative mt-6 flex items-center justify-between">
          <div className="absolute left-[13%] right-[13%] top-4 h-px bg-white/[0.08]" />
          <motion.div
            className="absolute left-[13%] top-[15px] h-[2px] bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300"
            initial={{ width: 0 }}
            animate={{ width: "74%" }}
            transition={{ duration: 1.4, delay: 0.35, ease: "easeOut" }}
          />
          {nodes.map((node, index) => (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.22, duration: 0.35 }}
              className="relative z-10 flex flex-col items-center"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/15 ${node.ring}`}>
                <span className={`h-2 w-2 rounded-full ${node.dot} shadow-[0_0_12px_rgba(129,140,248,0.8)]`} />
              </span>
              <span className="mt-2 font-mono text-[8px] font-bold tracking-[0.14em] text-foreground/50">{node.label}</span>
              <span className="mt-0.5 font-mono text-[9px] text-white/75">{node.detail}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2">
          <span className="flex items-center gap-2 text-[9px] text-foreground/38">
            <Activity className="h-3 w-3 text-emerald-400/60" /> Bottleneck isolated
          </span>
          <span className="font-mono text-[9px] font-semibold text-emerald-300/75">−34% potential</span>
        </div>
      </div>
      <div className="absolute -bottom-1 left-1/2 h-8 w-44 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-2xl" />
    </div>
  );
}

function RelayHero({
  used,
  limit,
  percentage,
}: {
  used?: number;
  limit?: number;
  percentage: number;
}) {
  return (
    <RelayFade>
      <section className="relative overflow-hidden rounded-3xl border border-indigo-400/[0.15] bg-gradient-to-br from-[#0c0c21] via-[#080a16] to-[#05070d] p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/65 to-transparent" />
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/[0.10] blur-3xl" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_68%)]" />
        <ReticleCorners />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.08] px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-indigo-300">Pipeline intelligence · Online</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden shrink-0 sm:block">
                <div className="absolute inset-0 rounded-2xl bg-indigo-400/30 blur-xl" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 via-indigo-400 to-blue-600 shadow-xl shadow-indigo-500/25">
                  <Workflow className="h-7 w-7 text-slate-950" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-indigo-100 to-blue-300 bg-clip-text text-4xl font-bold tracking-[-0.04em] text-transparent sm:text-5xl">Relay</h1>
                <p className="mt-1 text-[13px] text-foreground/45">Make every CI minute earn its place.</p>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-foreground/55">
              Trace the critical path through your pipeline. Relay turns run evidence into clear, prioritized changes—without touching your workflow.
            </p>

            <div className="mt-6 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
              {PIPELINE_SIGNALS.map(({ label, value, icon: Icon }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.06 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
                >
                  <Icon className="mb-2 h-3.5 w-3.5 text-indigo-300/60" />
                  <p className="font-mono text-[8px] uppercase tracking-widest text-foreground/27">{label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-foreground/60">{value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <PipelinePreview />
            <div className="mx-auto max-w-[330px] rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/32"><Zap className="h-3 w-3 text-indigo-300/60" />Monthly quota</span>
                <span className="font-mono text-[10px] font-semibold text-indigo-200/70">{used !== undefined ? `${used} / ${(limit ?? 0) < 0 ? "∞" : limit}` : "— / —"}</span>
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.9 }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </RelayFade>
  );
}

function CapabilityStrip() {
  return (
    <RelayFade delay={0.08} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/28">Detects</span>
      {CAPABILITIES.map((cap, index) => (
        <motion.span
          key={cap}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + index * 0.04 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[11px] text-foreground/45 transition hover:border-indigo-400/25 hover:text-foreground/70"
        >
          <span className="h-1 w-1 rounded-full bg-indigo-400/60" />{cap}
        </motion.span>
      ))}
    </RelayFade>
  );
}

export default function RelayPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { data: me } = useMe();
  const [title, setTitle] = useState("");
  const [repository, setRepository] = useState("");
  const [notes, setNotes] = useState("");
  const [pipelineData, setPipelineData] = useState("");
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ["relay-analyses"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listRelayAnalyses(token);
    },
  });

  const usage = me?.usage?.relay;
  const usagePercent = usage && usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      if (text.length > 2_000_000) {
        setError("Pipeline evidence must be smaller than 2 MB.");
        return;
      }
      setPipelineData(text);
      setFilename(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("That file could not be read.");
    }
  }

  async function submit() {
    setError(null);
    if (pipelineData.trim().length < 20) {
      setError("Add at least 20 characters of workflow or run evidence.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      const response = await createRelayAnalysis(token, {
        title: title.trim() || undefined,
        repository: repository.trim() || undefined,
        notes: notes.trim() || undefined,
        pipelineData,
        filename: filename || undefined,
      });
      router.push(`/app/relay/${response.analysis.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-16">
      <RelayAtmosphere />
      <RelayHero used={usage?.used} limit={usage?.limit} percentage={usagePercent} />
      <CapabilityStrip />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <RelayFade delay={0.12}>
          <RelayGlass glow>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/[0.08] text-indigo-300"><Gauge className="h-4 w-4" /></span>
                <div>
                  <h2 className="text-sm font-semibold text-white">New pipeline analysis</h2>
                  <p className="mt-0.5 text-[11px] text-foreground/35">Evidence in. Bottlenecks out.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/12 bg-emerald-400/[0.045] px-2.5 py-1 text-[9px] text-emerald-300/65"><ShieldCheck className="h-3 w-3" />Read-only</div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-[11px] font-medium text-foreground/45">
                  Analysis title
                  <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Frontend CI slowdown" maxLength={200} />
                </label>
                <label className="space-y-1.5 text-[11px] font-medium text-foreground/45">
                  Repository <span className="text-foreground/25">optional</span>
                  <input className={fieldClass} value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" maxLength={300} />
                </label>
              </div>

              <label className="mt-4 block space-y-1.5 text-[11px] font-medium text-foreground/45">
                Operational context <span className="text-foreground/25">optional</span>
                <textarea className={`${fieldClass} min-h-20 resize-y`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What changed, which branch is affected, or what a normal run looks like…" maxLength={10_000} />
              </label>

              <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-400/20 bg-[#050711] shadow-inner shadow-black/60">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.025] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-400/[0.09] text-indigo-300"><FileCode2 className="h-4 w-4" /></span>
                    <div>
                      <p className="text-xs font-medium text-white">Pipeline evidence</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/28">JSON · YAML · CSV · LOG · TXT</p>
                    </div>
                  </div>
                  <label className="group inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-400/25 bg-indigo-400/[0.08] px-3 py-2 text-[11px] font-semibold text-indigo-200 transition hover:border-indigo-300/40 hover:bg-indigo-400/[0.14]">
                    <FileUp className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5" />Choose file
                    <input type="file" className="sr-only" accept=".json,.yml,.yaml,.csv,.txt,.log" onChange={(event) => void handleFile(event.target.files?.[0])} />
                  </label>
                </div>
                {filename ? (
                  <div className="flex items-center gap-2 border-b border-indigo-400/10 bg-indigo-400/[0.035] px-4 py-2 font-mono text-[10px] text-indigo-200/65"><CheckCircle2 className="h-3 w-3 text-emerald-400/70" />{filename} loaded</div>
                ) : null}
                <div className="relative">
                  <div className="pointer-events-none absolute bottom-4 left-3 top-4 w-px bg-gradient-to-b from-indigo-400/20 via-indigo-400/5 to-transparent" />
                  <textarea
                    className="min-h-64 w-full resize-y bg-transparent py-4 pl-7 pr-4 font-mono text-xs leading-6 text-indigo-50/75 outline-none placeholder:text-foreground/18"
                    value={pipelineData}
                    onChange={(event) => { setPipelineData(event.target.value); setFilename(""); }}
                    placeholder={'Paste workflow YAML, CI run JSON, step timings, cache logs, or test retry history…'}
                    maxLength={2_000_000}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.05] bg-black/20 px-4 py-2 font-mono text-[9px] text-foreground/25">
                  <span>Remove secrets before analysis</span>
                  <span>{pipelineData.length.toLocaleString()} / 2,000,000</span>
                </div>
              </div>

              {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs text-red-300">{error}</p> : null}

              <Button onClick={() => void submit()} disabled={submitting} className="group mt-5 h-11 w-full bg-gradient-to-r from-indigo-500 via-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-950/50 transition hover:from-indigo-400 hover:to-blue-400">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {submitting ? "Tracing pipeline…" : "Reveal optimization opportunities"}
                {!submitting ? <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" /> : null}
              </Button>
            </div>
          </RelayGlass>
        </RelayFade>

        <RelayFade delay={0.18} className="space-y-4">
          <RelayGlass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300/65">Signal quality</p>
              <Activity className="h-4 w-4 text-indigo-300/40" />
            </div>
            <div className="space-y-3">
              {[
                ["Step durations", "Essential", 92],
                ["Cache events", "High value", 76],
                ["Retry history", "Diagnostic", 58],
                ["Runner metadata", "Context", 42],
              ].map(([label, value, width]) => (
                <div key={String(label)}>
                  <div className="mb-1.5 flex justify-between text-[10px]"><span className="text-foreground/45">{label}</span><span className="font-mono text-foreground/25">{value}</span></div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500/70 to-blue-400/70" style={{ width: `${width}%` }} /></div>
                </div>
              ))}
            </div>
          </RelayGlass>

          <RelayGlass className="p-5">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300/65">What Relay returns</p>
            <ol className="mt-4 space-y-4">
              {[
                ["01", "Critical path", "The sequence controlling total time"],
                ["02", "Evidence-backed findings", "No guesswork disguised as certainty"],
                ["03", "Prioritized actions", "Highest-confidence wins first"],
              ].map(([number, title, copy]) => (
                <li key={number} className="flex gap-3">
                  <span className="font-mono text-[9px] text-indigo-300/45">{number}</span>
                  <div><p className="text-[11px] font-semibold text-foreground/68">{title}</p><p className="mt-1 text-[10px] leading-relaxed text-foreground/32">{copy}</p></div>
                </li>
              ))}
            </ol>
          </RelayGlass>

          <div className="rounded-2xl border border-dashed border-white/[0.07] p-4 text-[10px] leading-relaxed text-foreground/30">
            <div className="mb-2 flex items-center gap-2 text-foreground/45"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400/55" /><span className="font-semibold">Your pipeline stays yours</span></div>
            Relay analyzes the evidence you provide and never edits CI configuration automatically.
          </div>
        </RelayFade>
      </div>

      <RelayFade delay={0.22}>
        <section className="pt-2">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2"><TimerReset className="h-4 w-4 text-indigo-300/55" /><span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300/55">Analysis archive</span></div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Recent pipeline scans</h2>
              <p className="mt-1 text-xs text-foreground/35">Revisit your last 40 reports and compare improvements.</p>
            </div>
          </div>

          {history.isLoading ? (
            <RelayGlass className="flex items-center justify-center gap-2 py-14 text-sm text-foreground/40"><Loader2 className="h-4 w-4 animate-spin text-indigo-300" />Loading analyses…</RelayGlass>
          ) : history.isError ? (
            <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-5 text-sm text-red-300">{history.error instanceof Error ? history.error.message : "Could not load analyses"}</div>
          ) : history.data?.analyses.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.data.analyses.map((analysis, index) => (
                <motion.div key={analysis.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
                  <Link href={`/app/relay/${analysis.id}`} className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-400/25 hover:shadow-xl hover:shadow-indigo-950/25">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/0 to-transparent transition group-hover:via-indigo-400/45" />
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-indigo-400/15 bg-indigo-400/[0.07] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-indigo-200/65">{analysis.status}</span>
                      {analysis.score != null ? <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/15 bg-black/20 font-mono text-[11px] font-semibold text-indigo-200">{analysis.score}</span> : <Workflow className="h-4 w-4 text-foreground/18" />}
                    </div>
                    <h3 className="mt-4 truncate text-sm font-semibold text-white">{analysis.title}</h3>
                    <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-relaxed text-foreground/38">{analysis.summary || analysis.repository || "Analysis is waiting to begin."}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 font-mono text-[9px] text-foreground/23">
                      <span>PIPELINE REPORT</span><ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <RelayGlass className="relative py-14 text-center">
              <Workflow className="mx-auto h-7 w-7 text-indigo-300/25" />
              <p className="mt-3 text-sm text-foreground/40">Your first pipeline analysis will appear here.</p>
              <p className="mt-1 text-[10px] text-foreground/22">Add evidence above to illuminate the critical path.</p>
            </RelayGlass>
          )}
        </section>
      </RelayFade>
    </div>
  );
}
