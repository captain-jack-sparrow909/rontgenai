"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileCode2,
  Hammer,
  Loader2,
  X,
} from "lucide-react";
import {
  ForgeAtmosphere,
  ForgeFade,
  ForgeGlass,
  ForgeLabel,
} from "@/components/forge/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  approveForgeJob,
  getForgeJob,
  rejectForgeJob,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ForgeJobPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["forge-job", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getForgeJob(token, id);
    },
    refetchInterval: (q) => {
      const stage = q.state.data?.job.stage;
      const status = q.state.data?.job.status;
      if (status === "failed") return false;
      if (
        stage === "planning" ||
        stage === "implementing" ||
        status === "queued" ||
        status === "running"
      ) {
        return 2000;
      }
      return false;
    },
  });

  const job = query.data?.job;
  const plan = job?.result?.plan;
  const stage = job?.stage ?? "unknown";

  async function onApprove() {
    setBusy("approve");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      await approveForgeJob(token, id);
      await queryClient.invalidateQueries({ queryKey: ["forge-job", id] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setError("Usage limit or plan blocks implement. Check Billing.");
      } else {
        setError(e instanceof Error ? e.message : "Approve failed");
      }
    } finally {
      setBusy(null);
    }
  }

  async function onReject() {
    setBusy("reject");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      await rejectForgeJob(token, id);
      await queryClient.invalidateQueries({ queryKey: ["forge-job", id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-3xl">
      <ForgeAtmosphere />

      <ForgeFade>
        <div className="mb-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/forge">
              <ArrowLeft className="h-4 w-4" />
              All jobs
            </Link>
          </Button>
        </div>
      </ForgeFade>

      {query.isLoading ? (
        <ForgeGlass className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          <span className="text-sm text-foreground/50">Loading job…</span>
        </ForgeGlass>
      ) : query.isError ? (
        <ForgeGlass className="p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load"}
        </ForgeGlass>
      ) : job ? (
        <div className="space-y-6">
          <ForgeFade delay={0.05}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-slate-950">
                <Hammer className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StageChip stage={stage} status={job.status} />
                  {plan?.complexity ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-foreground/50">
                      {plan.complexity}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  {job.issue?.title || "Forge job"}
                </h1>
                {job.issueUrl ? (
                  <a
                    href={job.issueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-rose-300/80 hover:text-rose-200"
                  >
                    {job.issueUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </ForgeFade>

          {(stage === "planning" ||
            job.status === "queued" ||
            job.status === "running") &&
          stage !== "done" &&
          stage !== "awaiting_approval" &&
          stage !== "rejected" ? (
            <ForgeGlass glow className="flex flex-col items-center gap-3 py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  {stage === "implementing"
                    ? "Writing code & opening PR…"
                    : "Drafting implementation plan…"}
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  This usually takes 20–90 seconds
                </p>
              </div>
            </ForgeGlass>
          ) : null}

          {job.status === "failed" ? (
            <ForgeGlass className="border-red-500/30 p-6">
              <p className="text-sm text-red-300">
                {job.error || "Job failed"}
              </p>
            </ForgeGlass>
          ) : null}

          {job.issue?.body ? (
            <ForgeFade delay={0.08}>
              <ForgeLabel index="IS">Issue</ForgeLabel>
              <ForgeGlass className="p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground/70">
                  {job.issue.body.slice(0, 2500)}
                  {job.issue.body.length > 2500 ? "…" : ""}
                </p>
                {job.issue.labels?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {job.issue.labels.map((l) => (
                      <span
                        key={l}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground/45"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                ) : null}
              </ForgeGlass>
            </ForgeFade>
          ) : null}

          {plan ? (
            <>
              <ForgeFade delay={0.1}>
                <ForgeLabel index="PL">Plan</ForgeLabel>
                <ForgeGlass glow className="space-y-4 p-5">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {plan.summary}
                  </p>
                  {plan.approach ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/70">
                        Approach
                      </p>
                      <p className="mt-1 text-sm text-foreground/65">
                        {plan.approach}
                      </p>
                    </div>
                  ) : null}

                  {plan.files_to_touch?.length ? (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-rose-300/70">
                        Files
                      </p>
                      <ul className="space-y-2">
                        {plan.files_to_touch.map((f) => (
                          <li
                            key={f.path}
                            className="rounded-xl border border-white/8 bg-black/25 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <FileCode2 className="h-3.5 w-3.5 text-rose-400/80" />
                              <span className="font-mono text-xs text-rose-100/90">
                                {f.path}
                              </span>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-foreground/40">
                                {f.action}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-foreground/50">
                              {f.rationale}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {plan.steps?.length ? (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                          Steps
                        </p>
                        <ol className="list-decimal space-y-1 pl-4 text-xs text-foreground/65">
                          {plan.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {plan.test_plan?.length ? (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                          Test plan
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/65">
                          {plan.test_plan.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  {plan.risks?.length ? (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">
                        Risks
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/60">
                        {plan.risks.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </ForgeGlass>
              </ForgeFade>

              {stage === "awaiting_approval" ? (
                <ForgeFade delay={0.14}>
                  <ForgeGlass className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Approve to write code &amp; open a PR?
                      </p>
                      <p className="mt-1 text-xs text-foreground/45">
                        No commits until you approve. This meters another Forge
                        unit.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() => void onReject()}
                      >
                        {busy === "reject" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                      <Button
                        disabled={busy !== null}
                        onClick={() => void onApprove()}
                        className="bg-gradient-to-r from-rose-400 to-pink-500 text-slate-950 hover:brightness-110"
                      >
                        {busy === "approve" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve &amp; implement
                      </Button>
                    </div>
                  </ForgeGlass>
                </ForgeFade>
              ) : null}
            </>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {stage === "implementing" ? (
            <ForgeGlass glow className="flex items-center gap-3 p-5">
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Implementing approved plan…
                </p>
                <p className="text-xs text-foreground/45">
                  Generating files and opening pull request
                </p>
              </div>
            </ForgeGlass>
          ) : null}

          {stage === "done" && job.result?.pr ? (
            <ForgeFade>
              <ForgeGlass glow className="p-6 text-center">
                <Check className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="mt-3 text-lg font-semibold text-white">
                  Pull request opened
                </p>
                <p className="mt-1 text-sm text-foreground/50">
                  Branch{" "}
                  <code className="text-rose-200/80">
                    {job.result.pr.branch}
                  </code>
                </p>
                <Button asChild className="mt-4" size="lg">
                  <a
                    href={job.result.pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PR #{job.result.pr.number}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {job.result.changes?.length ? (
                  <ul className="mx-auto mt-6 max-w-md space-y-1 text-left text-xs text-foreground/50">
                    {job.result.changes.map((c) => (
                      <li key={c.path} className="font-mono">
                        {c.action} · {c.path}
                        {c.bytes != null ? ` (${c.bytes} B)` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ForgeGlass>
            </ForgeFade>
          ) : null}

          {stage === "rejected" ? (
            <ForgeGlass className="p-6 text-center text-sm text-foreground/55">
              Plan rejected. Start a new job from Forge home if needed.
            </ForgeGlass>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StageChip({ stage, status }: { stage: string; status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        stage === "done" &&
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        stage === "awaiting_approval" &&
          "border-amber-400/30 bg-amber-400/10 text-amber-300",
        stage === "rejected" && "border-white/15 bg-white/5 text-foreground/50",
        status === "failed" && "border-red-400/30 bg-red-400/10 text-red-300",
        ["planning", "implementing"].includes(stage) &&
          "border-rose-400/30 bg-rose-400/10 text-rose-300",
      )}
    >
      {stage}
    </span>
  );
}
