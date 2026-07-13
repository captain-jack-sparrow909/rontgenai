"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CircleDot,
  Hammer,
  Loader2,
  Sparkles,
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
  createForgeJob,
  getForgeStatus,
  listForgeJobs,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

export default function ForgePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [issueUrl, setIssueUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.forge;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const status = useQuery({
    queryKey: ["forge-status"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getForgeStatus(token);
    },
  });

  const jobs = useQuery({
    queryKey: ["forge-jobs"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listForgeJobs(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.jobs ?? [];
      const pending = items.some(
        (j) =>
          ["queued", "running"].includes(j.status) ||
          ["planning", "implementing"].includes(j.stage),
      );
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");
        const res = await createForgeJob(token, {
          issueUrl: issueUrl.trim(),
        });
        await queryClient.invalidateQueries({ queryKey: ["forge-jobs"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/forge/${res.job.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError(
            err.message.includes("Pro")
              ? "Forge requires Pro or Team. Upgrade on Billing."
              : "Forge limit reached this month. Upgrade on Billing.",
          );
        } else {
          setError(err instanceof Error ? err.message : "Failed to start Forge");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [getToken, issueUrl, queryClient, router],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <ForgeAtmosphere />

      <ForgeFade>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                Issue smithy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-rose-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 via-rose-400 to-pink-600 text-slate-950 shadow-lg shadow-rose-500/30">
                  <Hammer className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Forge
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  Issues in → plan approve → PR out
                </p>
              </div>
            </div>
          </div>

          <ForgeGlass className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-rose-300/80">
                {usage
                  ? usage.limit === 0
                    ? "Pro+"
                    : `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500"
                initial={{ width: 0 }}
                animate={{
                  width: usage?.limit === 0 ? "0%" : `${usagePct}%`,
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">
              plan + implement / mo
            </p>
          </ForgeGlass>
        </div>
      </ForgeFade>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ForgeFade delay={0.08}>
          <form onSubmit={onSubmit}>
            <ForgeGlass glow>
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-rose-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Solve an issue
                  </h2>
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  Paste a GitHub issue URL. Forge drafts a plan first — you
                  approve before any code is written or PR opened.
                </p>
                <p className="mt-2 text-[11px] text-foreground/35">
                  GitHub token:{" "}
                  {status.data?.githubTokenConfigured ? "yes" : "no"} · Plan:{" "}
                  {status.data?.plan ?? "…"}
                  {status.data && !status.data.planAllows
                    ? " (upgrade required)"
                    : ""}
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Issue URL
                  </label>
                  <input
                    value={issueUrl}
                    onChange={(e) => setIssueUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/issues/42"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-foreground/30 focus:border-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                  />
                </div>

                <div className="grid gap-2 rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] text-foreground/50 sm:grid-cols-3">
                  <div>
                    <p className="font-semibold text-rose-300/80">1. Plan</p>
                    <p>Read issue + repo context</p>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-300/80">2. Approve</p>
                    <p>You review scope &amp; files</p>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-300/80">3. PR</p>
                    <p>Branch + commits + pull request</p>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}{" "}
                    {error.includes("Billing") ? (
                      <Link
                        href="/app/billing"
                        className="font-medium underline"
                      >
                        Billing
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-foreground/35">
                    Needs GITHUB_TOKEN with contents + PR write (or GitHub App)
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting || !issueUrl.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-rose-400 to-pink-500 text-slate-950 shadow-lg shadow-rose-500/25 hover:brightness-110"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Planning…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Draft plan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ForgeGlass>
          </form>
        </ForgeFade>

        <ForgeFade delay={0.12}>
          <ForgeLabel index="JB">Jobs</ForgeLabel>
          <div className="space-y-2">
            {jobs.isLoading ? (
              <ForgeGlass className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading…
              </ForgeGlass>
            ) : jobs.isError ? (
              <ForgeGlass className="px-4 py-6 text-center text-xs text-amber-300/90">
                {jobs.error instanceof Error
                  ? jobs.error.message
                  : "Could not load"}
              </ForgeGlass>
            ) : !jobs.data?.jobs.length ? (
              <ForgeGlass className="px-4 py-10 text-center">
                <Hammer className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">No forge jobs yet.</p>
              </ForgeGlass>
            ) : (
              jobs.data.jobs.map((j, i) => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                >
                  <Link href={`/app/forge/${j.id}`} className="group block">
                    <ForgeGlass className="p-3.5 transition duration-300 group-hover:border-rose-400/25 group-hover:bg-white/[0.05]">
                      <p className="truncate text-sm font-medium text-white">
                        {j.title || "Issue job"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-foreground/40">
                        {j.issueUrl || "—"}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[10px] text-foreground/35">
                          {j.prUrl ? `PR #${j.prNumber}` : j.stage}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                            j.stage === "done" &&
                              "bg-emerald-400/15 text-emerald-300",
                            j.stage === "awaiting_approval" &&
                              "bg-amber-400/15 text-amber-300",
                            j.stage === "rejected" &&
                              "bg-white/10 text-foreground/50",
                            j.status === "failed" &&
                              "bg-red-400/15 text-red-300",
                            ["planning", "implementing"].includes(j.stage) &&
                              "animate-pulse bg-rose-400/15 text-rose-300",
                          )}
                        >
                          {j.stage}
                        </span>
                      </div>
                    </ForgeGlass>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </ForgeFade>
      </div>
    </div>
  );
}
