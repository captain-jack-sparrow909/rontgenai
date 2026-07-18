"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  CopyCheck,
  Gauge,
  Loader2,
  Route,
  TestTube2,
  Workflow,
} from "lucide-react";
import { MermaidDiagram } from "@/components/atlas/mermaid-diagram";
import { Button } from "@/components/ui/button";
import { getRelayAnalysis, type RelayFinding } from "@/lib/api";

const confidenceClass: Record<string, string> = {
  high: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  low: "border-white/10 bg-white/5 text-foreground/45",
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] ${className}`}>{children}</div>;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Workflow; children: React.ReactNode }) {
  return <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300/75"><Icon className="h-4 w-4" />{children}</h2>;
}

function Evidence({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul className="mt-3 space-y-1.5 border-l border-indigo-400/20 pl-3">{items.map((item, index) => <li key={`${index}-${item}`} className="font-mono text-[11px] leading-relaxed text-foreground/45">{item}</li>)}</ul>;
}

function FindingCard({ finding, index }: { finding: RelayFinding; index: number }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-indigo-300/50">{String(index + 1).padStart(2, "0")} · {finding.category.replaceAll("_", " ")}</p>
          <h3 className="mt-1.5 text-sm font-semibold text-white">{finding.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {finding.estimated_savings_percent != null ? <span className="rounded-full border border-blue-400/20 bg-blue-400/[0.08] px-2 py-1 font-mono text-[10px] text-blue-200">up to {finding.estimated_savings_percent}% observed potential</span> : null}
          <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase ${confidenceClass[finding.confidence]}`}>{finding.confidence}</span>
        </div>
      </div>
      <Evidence items={finding.evidence} />
      {finding.impact ? <div className="mt-4"><p className="text-[10px] uppercase tracking-wider text-foreground/30">Impact</p><p className="mt-1 text-xs leading-relaxed text-foreground/60">{finding.impact}</p></div> : null}
      <div className="mt-4 rounded-xl border border-indigo-400/12 bg-indigo-400/[0.035] p-3">
        <p className="text-[10px] uppercase tracking-wider text-indigo-300/55">Recommendation</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/68">{finding.recommendation}</p>
        <p className="mt-2 flex gap-2 text-[11px] leading-relaxed text-foreground/40"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300/55" />{finding.validation}</p>
      </div>
    </Panel>
  );
}

export default function RelayAnalysisPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const query = useQuery({
    queryKey: ["relay-analysis", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getRelayAnalysis(token, id);
    },
    refetchInterval: (current) => {
      const status = current.state.data?.analysis.status;
      return status === "queued" || status === "running" ? 2_000 : false;
    },
  });

  const analysis = query.data?.analysis;
  const report = analysis?.result?.report;
  const pending = analysis?.status === "queued" || analysis?.status === "running";

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 pb-16">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.09),transparent_33%),radial-gradient(circle_at_78%_72%,rgba(37,99,235,0.06),transparent_32%)]" />
      <Button asChild variant="ghost" size="sm" className="text-foreground/55 hover:text-white"><Link href="/app/relay"><ArrowLeft className="h-4 w-4" />All analyses</Link></Button>

      {query.isLoading ? (
        <Panel className="flex items-center justify-center gap-3 py-20 text-sm text-foreground/45"><Loader2 className="h-5 w-5 animate-spin text-indigo-300" />Loading pipeline report…</Panel>
      ) : query.isError ? (
        <Panel className="border-red-400/20 p-6 text-center text-sm text-red-300">{query.error instanceof Error ? query.error.message : "Could not load the analysis"}</Panel>
      ) : analysis ? (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.12] via-white/[0.025] to-blue-500/[0.05] p-6 sm:p-8">
            <Workflow className="absolute -right-4 -top-4 h-40 w-40 text-indigo-300 opacity-[0.06]" strokeWidth={0.8} />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-indigo-200">{analysis.status}</span>
                  {analysis.input.repository ? <span className="font-mono text-[10px] text-foreground/35">{analysis.input.repository}</span> : null}
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{analysis.input.title || "CI pipeline analysis"}</h1>
                <p className="mt-2 font-mono text-[10px] text-foreground/30">{new Date(analysis.createdAt).toLocaleString()}{analysis.input.filename ? ` · ${analysis.input.filename}` : ""}</p>
              </div>
              {report ? (
                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-indigo-400/20 bg-black/20">
                  <span className="text-2xl font-semibold text-indigo-200">{report.pipeline_score}</span>
                  <span className="font-mono text-[9px] uppercase text-foreground/35">score</span>
                </div>
              ) : null}
            </div>
          </section>

          {pending ? <Panel className="flex flex-col items-center gap-3 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-300" /><div><p className="text-sm font-medium text-white">Tracing the pipeline…</p><p className="mt-1 text-xs text-foreground/40">Finding critical paths, misses, retries, and duplicated work</p></div></Panel> : null}
          {analysis.status === "failed" ? <Panel className="border-red-400/20 p-5 text-sm text-red-300">{analysis.error || "Pipeline analysis failed"}</Panel> : null}

          {report ? (
            <>
              <section><SectionTitle icon={Gauge}>Executive summary</SectionTitle><Panel className="p-5"><p className="text-sm leading-relaxed text-foreground/72">{report.summary}</p>{report.observed_duration ? <p className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] text-indigo-200/70"><Clock3 className="h-3.5 w-3.5" />Observed duration: {report.observed_duration}</p> : null}</Panel></section>

              {report.workflow_graph_mermaid ? <section><SectionTitle icon={Workflow}>Observed workflow</SectionTitle><Panel className="overflow-hidden"><MermaidDiagram code={report.workflow_graph_mermaid} label="Relay CI workflow graph" /></Panel></section> : null}

              {report.critical_path.length ? <section><SectionTitle icon={Route}>Critical path</SectionTitle><Panel className="p-4"><ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{report.critical_path.map((step, index) => <li key={`${index}-${step}`} className="flex items-center gap-2 rounded-xl border border-indigo-400/12 bg-indigo-400/[0.035] px-3 py-2 text-xs text-foreground/65"><span className="font-mono text-[10px] text-indigo-300/60">{index + 1}</span>{step}</li>)}</ol></Panel></section> : null}

              <section><SectionTitle icon={AlertTriangle}>Findings · {report.findings.length}</SectionTitle><div className="space-y-3">{report.findings.length ? report.findings.map((finding, index) => <FindingCard key={`${index}-${finding.title}`} finding={finding} index={index} />) : <Panel className="p-5 text-sm text-foreground/45">No evidence-backed optimization finding was identified.</Panel>}</div></section>

              <div className="grid gap-5 lg:grid-cols-2">
                <section><SectionTitle icon={Boxes}>Cache analysis</SectionTitle><Panel className="h-full p-5"><p className="text-xs leading-relaxed text-foreground/60">{report.cache_analysis.current_state}</p>{report.cache_analysis.misses.length ? <div className="mt-4"><p className="text-[10px] uppercase tracking-wider text-foreground/30">Observed misses</p><Evidence items={report.cache_analysis.misses} /></div> : null}{report.cache_analysis.recommendations.length ? <ul className="mt-4 space-y-2">{report.cache_analysis.recommendations.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-foreground/58"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300/60" />{item}</li>)}</ul> : null}</Panel></section>
                <section><SectionTitle icon={CopyCheck}>Duplicated work</SectionTitle><Panel className="h-full p-5">{report.duplicated_work.length ? <ul className="space-y-2">{report.duplicated_work.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-foreground/58"><CopyCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300/60" />{item}</li>)}</ul> : <p className="text-xs text-foreground/38">No duplicated work was supported by the supplied evidence.</p>}</Panel></section>
              </div>

              {report.flaky_tests.length ? <section><SectionTitle icon={TestTube2}>Flaky test candidates</SectionTitle><div className="grid gap-3 sm:grid-cols-2">{report.flaky_tests.map((test, index) => <Panel key={`${index}-${test.test}`} className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-mono text-xs text-white">{test.test}</h3><span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase ${confidenceClass[test.confidence]}`}>{test.confidence}</span></div><Evidence items={test.evidence} /><p className="mt-3 text-xs leading-relaxed text-foreground/58"><span className="text-foreground/35">Suspected cause: </span>{test.suspected_cause}</p><p className="mt-2 text-xs leading-relaxed text-indigo-200/65">Next: {test.next_step}</p></Panel>)}</div></section> : null}

              {report.prioritized_actions.length ? <section><SectionTitle icon={BadgeCheck}>Prioritized actions</SectionTitle><Panel className="p-5"><ol className="space-y-3">{report.prioritized_actions.map((action, index) => <li key={action} className="flex gap-3 text-sm leading-relaxed text-foreground/68"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-400/[0.08] font-mono text-[10px] text-indigo-200">{index + 1}</span>{action}</li>)}</ol></Panel></section> : null}

              {report.assumptions.length ? <section><SectionTitle icon={Braces}>Assumptions and missing evidence</SectionTitle><Panel className="p-5"><ul className="space-y-2">{report.assumptions.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-foreground/48"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/55" />{item}</li>)}</ul></Panel></section> : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
