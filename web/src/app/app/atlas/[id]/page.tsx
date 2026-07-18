"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FolderTree,
  Loader2,
  Map,
  Send,
  Star,
  TriangleAlert,
} from "lucide-react";
import {
  AtlasAtmosphere,
  AtlasFade,
  AtlasGlass,
  AtlasLabel,
} from "@/components/atlas/shell";
import { MermaidDiagram } from "@/components/atlas/mermaid-diagram";
import { MigrationAssessment } from "@/components/atlas/migration-assessment";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  chatAtlasMap,
  getAtlasMap,
  type AtlasChatMessage,
  type AtlasDiagram,
  type AtlasDiagramKind,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AtlasMapPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AtlasChatMessage[] | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [activeDiagramKind, setActiveDiagramKind] =
    useState<AtlasDiagramKind>("system");
  const bottomRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["atlas-map", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getAtlasMap(token, id);
    },
    refetchInterval: (q) => {
      const status = q.state.data?.map.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const map = query.data?.map;
  const report = map?.report;
  const messages = sending
    ? (localMessages ?? map?.messages ?? [])
    : (map?.messages ?? localMessages ?? []);
  const pending = map?.status === "queued" || map?.status === "running";
  const diagrams: AtlasDiagram[] = report
    ? report.diagrams?.length
      ? report.diagrams
      : report.mermaid
        ? [
            {
              kind: "system",
              title: "System architecture",
              description: "Primary repository architecture view.",
              mermaid: report.mermaid,
              evidence: [],
              confidence: "medium",
            },
          ]
        : []
    : [];
  const activeDiagram =
    diagrams.find((diagram) => diagram.kind === activeDiagramKind) ??
    diagrams[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function onSend() {
    const message = input.trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    setInput("");
    const optimistic: AtlasChatMessage = {
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages([...(map?.messages ?? []), optimistic]);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      const res = await chatAtlasMap(token, id, message);
      setLocalMessages([...(map?.messages ?? []), optimistic, res.message]);
      await queryClient.invalidateQueries({ queryKey: ["atlas-map", id] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("Atlas limit reached. Upgrade on Billing.");
      } else {
        setError(err instanceof Error ? err.message : "Chat failed");
      }
      setLocalMessages(map?.messages ?? []);
    } finally {
      setSending(false);
    }
  }

  async function copyMermaid() {
    if (!activeDiagram?.mermaid) return;
    await navigator.clipboard.writeText(activeDiagram.mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <AtlasAtmosphere />

      <AtlasFade>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/atlas">
              <ArrowLeft className="h-4 w-4" />
              All maps
            </Link>
          </Button>
          {map ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                map.status === "succeeded" &&
                  "border-violet-400/30 bg-violet-400/10 text-violet-300",
                map.status === "failed" &&
                  "border-red-400/30 bg-red-400/10 text-red-300",
                pending &&
                  "animate-pulse border-violet-400/30 bg-violet-400/10 text-violet-300",
              )}
            >
              {map.status}
            </span>
          ) : null}
        </div>
      </AtlasFade>

      {query.isLoading ? (
        <AtlasGlass className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          <span className="text-sm text-foreground/50">Loading map…</span>
        </AtlasGlass>
      ) : query.isError ? (
        <AtlasGlass className="p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load"}
        </AtlasGlass>
      ) : map ? (
        <div className="space-y-6">
          <AtlasFade delay={0.05}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Map className="h-4 w-4 text-violet-400" />
                  {map.analysisMode === "migration" ? (
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200/75">
                      Migration assessment
                    </span>
                  ) : null}
                  {map.snapshot?.meta.language ? (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground/50">
                      {map.snapshot.meta.language}
                    </span>
                  ) : null}
                  {map.snapshot?.meta.stars != null ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/45">
                      <Star className="h-3 w-3" />
                      {map.snapshot.meta.stars.toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {map.fullName}
                </h1>
                {map.snapshot?.meta.description ? (
                  <p className="mt-1 max-w-2xl text-sm text-foreground/50">
                    {map.snapshot.meta.description}
                  </p>
                ) : null}
                {map.url ? (
                  <a
                    href={map.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-violet-300/80 hover:text-violet-200"
                  >
                    Open on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </AtlasFade>

          {pending ? (
            <AtlasGlass glow className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  {map.analysisMode === "migration"
                    ? "Assessing migration path…"
                    : "Cartographing repository…"}
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  Fetching tree &amp; key files, then generating {map.analysisMode === "migration" ? "a staged plan" : "architecture"}
                </p>
              </div>
            </AtlasGlass>
          ) : null}

          {map.status === "failed" ? (
            <AtlasGlass className="border-red-500/30 p-6">
              <p className="text-sm text-red-300">{map.error || "Map failed"}</p>
              <Button asChild className="mt-4" variant="secondary">
                <Link href="/app/atlas">Try another repo</Link>
              </Button>
            </AtlasGlass>
          ) : null}

          {map.migration ? (
            <MigrationAssessment
              assessment={map.migration}
              request={map.migrationRequest}
            />
          ) : null}

          {report ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="space-y-6">
                <AtlasFade delay={0.08}>
                  <AtlasLabel index="01">Overview</AtlasLabel>
                  <AtlasGlass glow className="p-5 sm:p-6">
                    <p className="text-base leading-relaxed text-foreground/80">
                      {report.summary}
                    </p>
                    {report.architecture_overview ? (
                      <p className="mt-4 text-sm leading-relaxed text-foreground/60">
                        {report.architecture_overview}
                      </p>
                    ) : null}
                    {report.tech_stack?.length ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {report.tech_stack.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 text-[11px] text-violet-200/90"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </AtlasGlass>
                </AtlasFade>

                <AtlasFade delay={0.12}>
                  <div className="mb-3 flex items-center justify-between">
                    <AtlasLabel index="02">Architecture views</AtlasLabel>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyMermaid()}
                      disabled={!activeDiagram}
                      className="text-xs text-foreground/50"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" />
                      {copied ? "Copied" : "Copy Mermaid"}
                    </Button>
                  </div>
                  {diagrams.length ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {diagrams.map((diagram) => (
                          <button
                            key={diagram.kind}
                            type="button"
                            onClick={() => {
                              setActiveDiagramKind(diagram.kind);
                              setCopied(false);
                            }}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs capitalize transition",
                              activeDiagram?.kind === diagram.kind
                                ? "border-violet-400/40 bg-violet-400/15 text-violet-100"
                                : "border-white/8 bg-white/[0.03] text-foreground/45 hover:border-violet-400/25 hover:text-foreground/70",
                            )}
                          >
                            {diagram.kind}
                          </button>
                        ))}
                      </div>

                      {activeDiagram ? (
                        <AtlasGlass className="overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#08060f] px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-red-400/70" />
                              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                              <span className="ml-2 font-mono text-[10px] text-foreground/30">
                                {activeDiagram.kind}.mmd
                              </span>
                            </div>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider",
                                activeDiagram.confidence === "high" &&
                                  "border-emerald-400/20 text-emerald-300/70",
                                activeDiagram.confidence === "medium" &&
                                  "border-amber-400/20 text-amber-300/70",
                                activeDiagram.confidence === "low" &&
                                  "border-rose-400/20 text-rose-300/70",
                              )}
                            >
                              {activeDiagram.confidence} confidence
                            </span>
                          </div>
                          <div className="border-b border-white/5 px-4 py-3">
                            <p className="text-sm font-medium text-white">
                              {activeDiagram.title}
                            </p>
                            {activeDiagram.description ? (
                              <p className="mt-1 text-xs leading-relaxed text-foreground/50">
                                {activeDiagram.description}
                              </p>
                            ) : null}
                          </div>
                          <MermaidDiagram
                            key={activeDiagram.kind}
                            code={activeDiagram.mermaid}
                            label={activeDiagram.title}
                          />
                          {activeDiagram.evidence.length ? (
                            <div className="border-t border-white/5 px-4 py-3">
                              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-foreground/35">
                                Repository evidence
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {activeDiagram.evidence.map((path) => (
                                  <code
                                    key={path}
                                    className="rounded bg-violet-400/8 px-2 py-1 text-[10px] text-violet-200/60"
                                  >
                                    {path}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <details className="border-t border-white/5 px-4 py-3">
                            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-foreground/35">
                              Mermaid source
                            </summary>
                            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-violet-100/70">
                              {activeDiagram.mermaid}
                            </pre>
                          </details>
                        </AtlasGlass>
                      ) : null}
                    </div>
                  ) : (
                    <AtlasGlass className="p-5 text-sm text-foreground/50">
                      No architecture view was generated for this map.
                    </AtlasGlass>
                  )}
                </AtlasFade>

                {report.modules?.length ? (
                  <AtlasFade delay={0.15}>
                    <AtlasLabel index="03">Modules</AtlasLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {report.modules.map((m) => (
                        <AtlasGlass key={`${m.name}-${m.path}`} className="p-3.5">
                          <p className="text-sm font-medium text-white">
                            {m.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-violet-300/60">
                            {m.path}
                          </p>
                          <p className="mt-2 text-xs text-foreground/55">
                            {m.role}
                          </p>
                        </AtlasGlass>
                      ))}
                    </div>
                  </AtlasFade>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  {report.how_to_run?.length ? (
                    <div>
                      <AtlasLabel index="04">How to run</AtlasLabel>
                      <AtlasGlass className="p-4">
                        <ol className="space-y-2">
                          {report.how_to_run.map((s, i) => (
                            <li
                              key={s}
                              className="flex gap-2 text-sm text-foreground/70"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-400/15 font-mono text-[10px] text-violet-300">
                                {i + 1}
                              </span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </AtlasGlass>
                    </div>
                  ) : null}
                  {report.how_to_contribute?.length ? (
                    <div>
                      <AtlasLabel index="05">Contribute</AtlasLabel>
                      <AtlasGlass className="p-4">
                        <ol className="space-y-2">
                          {report.how_to_contribute.map((s, i) => (
                            <li
                              key={s}
                              className="flex gap-2 text-sm text-foreground/70"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-400/15 font-mono text-[10px] text-violet-300">
                                {i + 1}
                              </span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </AtlasGlass>
                    </div>
                  ) : null}
                </div>

                {/* Chat */}
                <AtlasFade delay={0.2}>
                  <AtlasLabel index="QA">Ask Atlas</AtlasLabel>
                  <AtlasGlass glow className="flex min-h-[320px] flex-col overflow-hidden">
                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                      {messages.map((m, i) => (
                        <div
                          key={`${m.createdAt}-${i}`}
                          className={cn(
                            "flex",
                            m.role === "user" ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                              m.role === "user"
                                ? "bg-gradient-to-br from-violet-500/25 to-purple-600/15 text-violet-50 ring-1 ring-violet-400/25"
                                : "border border-white/8 bg-white/[0.04] text-foreground/80",
                            )}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      ))}
                      {sending ? (
                        <div className="flex items-center gap-2 text-xs text-violet-300/70">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Mapping answer…
                        </div>
                      ) : null}
                      <div ref={bottomRef} />
                    </div>
                    {error ? (
                      <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                        {error}
                      </div>
                    ) : null}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void onSend();
                      }}
                      className="flex items-end gap-2 border-t border-white/5 p-3"
                    >
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        rows={2}
                        disabled={map.status !== "succeeded" || sending}
                        placeholder="Where is auth handled? How do tests run?"
                        className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-400/20 disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void onSend();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        disabled={
                          !input.trim() ||
                          sending ||
                          map.status !== "succeeded"
                        }
                        className="h-11 shrink-0 bg-gradient-to-r from-violet-400 to-purple-500 text-slate-950 hover:brightness-110"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </AtlasGlass>
                </AtlasFade>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {map.snapshot ? (
                  <AtlasFade delay={0.1}>
                    <AtlasLabel index="TR">Tree</AtlasLabel>
                    <AtlasGlass className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-foreground/45">
                        <FolderTree className="h-3.5 w-3.5" />
                        {map.snapshot.tree.totalFiles.toLocaleString()} files ·{" "}
                        {map.snapshot.tree.totalDirs.toLocaleString()} dirs
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {map.snapshot.tree.topLevel.slice(0, 16).map((p) => (
                          <span
                            key={p}
                            className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-violet-200/70"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </AtlasGlass>
                  </AtlasFade>
                ) : null}

                {report.entrypoints?.length ? (
                  <div>
                    <AtlasLabel index="EN">Entrypoints</AtlasLabel>
                    <AtlasGlass className="space-y-1 p-3">
                      {report.entrypoints.map((e) => (
                        <p
                          key={e}
                          className="font-mono text-[11px] text-violet-200/75"
                        >
                          {e}
                        </p>
                      ))}
                    </AtlasGlass>
                  </div>
                ) : null}

                {report.onboarding_checklist?.length ? (
                  <div>
                    <AtlasLabel index="OB">Onboarding</AtlasLabel>
                    <AtlasGlass className="space-y-2 p-3">
                      {report.onboarding_checklist.map((c) => (
                        <div
                          key={c}
                          className="flex gap-2 text-xs text-foreground/65"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400/80" />
                          {c}
                        </div>
                      ))}
                    </AtlasGlass>
                  </div>
                ) : null}

                {report.risks?.length ? (
                  <div>
                    <AtlasLabel index="RK">Risks</AtlasLabel>
                    <AtlasGlass className="space-y-2 p-3">
                      {report.risks.map((r) => (
                        <div
                          key={r}
                          className="flex gap-2 text-xs text-foreground/65"
                        >
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                          {r}
                        </div>
                      ))}
                    </AtlasGlass>
                  </div>
                ) : null}

                {report.how_to_run?.length ? (
                  <div className="hidden lg:block">
                    <AtlasLabel index="DOC">Docs signal</AtlasLabel>
                    <AtlasGlass className="flex items-center gap-2 p-3 text-xs text-foreground/50">
                      <BookOpen className="h-4 w-4 text-violet-400/70" />
                      Grounded in README + key files
                    </AtlasGlass>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
