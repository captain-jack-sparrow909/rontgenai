"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FileUp,
  Gauge,
  GitBranch,
  Loader2,
  Sparkles,
  TimerReset,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { createRelayAnalysis, listRelayAnalyses } from "@/lib/api";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-foreground/25 focus:border-indigo-400/45 focus:ring-2 focus:ring-indigo-400/10";

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
  const usagePercent =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

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
    <div className="relative mx-auto max-w-6xl space-y-8 pb-16">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(99,102,241,0.10),transparent_34%),radial-gradient(circle_at_84%_66%,rgba(37,99,235,0.07),transparent_32%)]" />

      <section className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.11] via-white/[0.025] to-blue-500/[0.06] p-6 sm:p-8">
        <div className="absolute right-8 top-6 hidden opacity-10 sm:block">
          <Workflow className="h-40 w-40 text-indigo-300" strokeWidth={0.8} />
        </div>
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-200">
            <Sparkles className="h-3 w-3" /> Relay pipeline intelligence
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Find where your CI time goes.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/58 sm:text-base">
            Turn workflow exports, run logs, test history, and cache telemetry into an evidence-backed critical path and prioritized fixes.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
              <GitBranch className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Analyze a pipeline</h2>
              <p className="text-xs text-foreground/40">Read-only analysis; Relay does not change your workflow.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs text-foreground/55">
              Analysis title
              <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Frontend CI slowdown" maxLength={200} />
            </label>
            <label className="space-y-1.5 text-xs text-foreground/55">
              Repository (optional)
              <input className={fieldClass} value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" maxLength={300} />
            </label>
          </div>

          <label className="mt-4 block space-y-1.5 text-xs text-foreground/55">
            Context (optional)
            <textarea className={`${fieldClass} min-h-20 resize-y`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What changed, which branch is affected, or what a normal run looks like…" maxLength={10_000} />
          </label>

          <div className="mt-4 rounded-xl border border-dashed border-indigo-400/25 bg-indigo-400/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Pipeline evidence</p>
                <p className="mt-1 text-xs text-foreground/40">JSON, YAML, CSV, text, or log exports · up to 2 MB</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-400/25 bg-indigo-400/10 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-400/15">
                <FileUp className="h-3.5 w-3.5" />
                Choose file
                <input type="file" className="sr-only" accept=".json,.yml,.yaml,.csv,.txt,.log" onChange={(event) => void handleFile(event.target.files?.[0])} />
              </label>
            </div>
            {filename ? <p className="mt-3 font-mono text-[11px] text-indigo-300/70">Loaded {filename}</p> : null}
            <textarea
              className={`${fieldClass} mt-3 min-h-56 resize-y font-mono text-xs leading-relaxed`}
              value={pipelineData}
              onChange={(event) => { setPipelineData(event.target.value); setFilename(""); }}
              placeholder={'Paste workflow YAML, CI run JSON, step timings, cache logs, or test retry history here…'}
              maxLength={2_000_000}
            />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-foreground/30">
              <span>Secrets should be removed before upload.</span>
              <span>{pipelineData.length.toLocaleString()} chars</span>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-xs text-red-300">{error}</p> : null}

          <Button onClick={() => void submit()} disabled={submitting} className="mt-5 w-full bg-indigo-500 text-white hover:bg-indigo-400">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
            {submitting ? "Starting analysis…" : "Analyze pipeline"}
          </Button>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/45">Monthly usage</span>
              <span className="font-mono text-indigo-200">{usage ? `${usage.used} / ${usage.limit}` : "—"}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-400/12 bg-indigo-400/[0.035] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300/70">Best evidence</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-foreground/50">
              <li>Job and step durations across several runs</li>
              <li>Cache keys, restore matches, and upload logs</li>
              <li>Test retries and comparable pass/fail history</li>
              <li>Workflow YAML and runner metadata</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.07] p-5 text-xs leading-relaxed text-foreground/40">
            Continuous GitHub and GitLab ingestion will follow after durable workers and webhook idempotency are in place. This version analyzes evidence you provide.
          </div>
        </aside>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent analyses</h2>
            <p className="mt-1 text-xs text-foreground/40">Your last 40 pipeline reports</p>
          </div>
          <TimerReset className="h-5 w-5 text-indigo-300/55" />
        </div>
        {history.isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] py-12 text-sm text-foreground/40"><Loader2 className="h-4 w-4 animate-spin" /> Loading analyses…</div>
        ) : history.isError ? (
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-5 text-sm text-red-300">{history.error instanceof Error ? history.error.message : "Could not load analyses"}</div>
        ) : history.data?.analyses.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {history.data.analyses.map((analysis) => (
              <Link key={analysis.id} href={`/app/relay/${analysis.id}`} className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-indigo-400/25 hover:bg-indigo-400/[0.035]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-indigo-400/20 bg-indigo-400/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase text-indigo-200/75">{analysis.status}</span>
                      {analysis.score != null ? <span className="font-mono text-[10px] text-foreground/35">score {analysis.score}</span> : null}
                    </div>
                    <h3 className="mt-3 truncate text-sm font-medium text-white">{analysis.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/42">{analysis.summary || analysis.repository || "Analysis is waiting to begin."}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-foreground/25 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.09] py-12 text-center text-sm text-foreground/35">Your first pipeline analysis will appear here.</div>
        )}
      </section>
    </div>
  );
}
