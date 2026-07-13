"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ExternalLink,
  GitPullRequest,
  Loader2,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  SentinelAtmosphere,
  SentinelFade,
  SentinelGlass,
  SentinelLabel,
} from "@/components/sentinel/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  claimSentinelInstallation,
  createSentinelReview,
  getSentinelStatus,
  listSentinelInstallations,
  listSentinelReviews,
  updateSentinelSettings,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

function SentinelInner() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [prUrl, setPrUrl] = useState("");
  const [postToGithub, setPostToGithub] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [installationId, setInstallationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const usage = me?.usage?.sentinel;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const status = useQuery({
    queryKey: ["sentinel-status"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getSentinelStatus(token);
    },
  });

  const installations = useQuery({
    queryKey: ["sentinel-installations"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listSentinelInstallations(token);
    },
  });

  const reviews = useQuery({
    queryKey: ["sentinel-reviews"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listSentinelReviews(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.reviews ?? [];
      const pending = items.some((r) =>
        ["queued", "running"].includes(r.status),
      );
      return pending ? 2500 : false;
    },
  });

  // Auto-claim installation_id from GitHub App setup redirect ?installation_id=
  useEffect(() => {
    const id = searchParams.get("installation_id");
    if (!id) return;
    void (async () => {
      setClaiming(true);
      try {
        const token = await getToken();
        if (!token) return;
        await claimSentinelInstallation(token, {
          installationId: Number(id),
        });
        setMessage(`Linked GitHub installation #${id}`);
        await queryClient.invalidateQueries({
          queryKey: ["sentinel-installations"],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to link installation");
      } finally {
        setClaiming(false);
      }
    })();
  }, [getToken, queryClient, searchParams]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setMessage(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");
        const res = await createSentinelReview(token, {
          prUrl: prUrl.trim(),
          postToGithub,
          autoApprove,
          installationId: installationId
            ? Number(installationId)
            : undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["sentinel-reviews"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/sentinel/${res.review.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError(
            err.message.includes("Pro")
              ? "Sentinel requires Pro or Team. Upgrade on Billing."
              : "Sentinel limit reached this month. Upgrade on Billing.",
          );
        } else {
          setError(err instanceof Error ? err.message : "Review failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      autoApprove,
      getToken,
      installationId,
      postToGithub,
      prUrl,
      queryClient,
      router,
    ],
  );

  async function toggleAutoApprove(instId: number, value: boolean) {
    const token = await getToken();
    if (!token) return;
    await updateSentinelSettings(token, {
      installationId: instId,
      autoApprove: value,
    });
    await queryClient.invalidateQueries({
      queryKey: ["sentinel-installations"],
    });
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <SentinelAtmosphere />

      <SentinelFade>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                PR guardian
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/30">
                  <Shield className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Sentinel
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  AI PR reviews that post comments on GitHub
                </p>
              </div>
            </div>
          </div>

          <SentinelGlass className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-amber-300/80">
                {usage
                  ? usage.limit === 0
                    ? "Pro+"
                    : `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                initial={{ width: 0 }}
                animate={{
                  width: usage?.limit === 0 ? "0%" : `${usagePct}%`,
                }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">
              PR reviews / month
            </p>
          </SentinelGlass>
        </div>
      </SentinelFade>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Connect */}
          <SentinelFade delay={0.06}>
            <SentinelLabel index="01">Connect GitHub</SentinelLabel>
            <SentinelGlass className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-md space-y-2 text-sm text-foreground/60">
                  <p>
                    <strong className="text-white/90">Option A — Manual:</strong>{" "}
                    paste a PR URL and use{" "}
                    <code className="text-amber-200/80">GITHUB_TOKEN</code> on
                    the API (repo read + pull request write).
                  </p>
                  <p>
                    <strong className="text-white/90">Option B — GitHub App:</strong>{" "}
                    install the app, then claim the installation for webhooks on
                    every PR.
                  </p>
                  <p className="text-xs text-foreground/40">
                    Token configured:{" "}
                    {status.data?.githubTokenConfigured ? "yes" : "no"} · App:{" "}
                    {status.data?.githubAppConfigured ? "yes" : "no"} · Plan:{" "}
                    {status.data?.plan ?? "…"}
                    {status.data && !status.data.planAllows
                      ? " (upgrade for Sentinel)"
                      : ""}
                  </p>
                </div>
                {status.data?.installUrl ? (
                  <Button
                    asChild
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:brightness-110"
                  >
                    <a href={status.data.installUrl} target="_blank" rel="noreferrer">
                      Install GitHub App
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-foreground/40">
                    Set GITHUB_APP_SLUG for one-click install link
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/5 pt-4">
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-foreground/40">
                    Claim installation ID
                  </label>
                  <input
                    value={installationId}
                    onChange={(e) => setInstallationId(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-foreground/30 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={claiming || !installationId}
                  onClick={async () => {
                    setClaiming(true);
                    setError(null);
                    try {
                      const token = await getToken();
                      if (!token) throw new Error("Sign in required");
                      await claimSentinelInstallation(token, {
                        installationId: Number(installationId),
                      });
                      setMessage(`Linked installation #${installationId}`);
                      setInstallationId("");
                      await queryClient.invalidateQueries({
                        queryKey: ["sentinel-installations"],
                      });
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Claim failed",
                      );
                    } finally {
                      setClaiming(false);
                    }
                  }}
                >
                  {claiming ? <Loader2 className="animate-spin" /> : null}
                  Link install
                </Button>
              </div>

              {installations.data?.installations?.length ? (
                <div className="mt-4 space-y-2">
                  {installations.data.installations.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {inst.account_login ||
                            `Installation ${inst.installation_id}`}
                        </p>
                        <p className="font-mono text-[10px] text-foreground/40">
                          id {inst.installation_id}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-foreground/55">
                        <Settings2 className="h-3.5 w-3.5" />
                        Auto-approve
                        <input
                          type="checkbox"
                          checked={Boolean(inst.metadata?.autoApprove)}
                          onChange={(e) =>
                            void toggleAutoApprove(
                              inst.installation_id,
                              e.target.checked,
                            )
                          }
                          className="rounded border-white/20"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}
            </SentinelGlass>
          </SentinelFade>

          {/* Manual review */}
          <SentinelFade delay={0.1}>
            <SentinelLabel index="02">Review a pull request</SentinelLabel>
            <form onSubmit={onSubmit}>
              <SentinelGlass glow className="p-5 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                      PR URL
                    </label>
                    <div className="relative">
                      <GitPullRequest className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
                      <input
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/42"
                        className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder:text-foreground/30 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-foreground/60">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={postToGithub}
                        onChange={(e) => setPostToGithub(e.target.checked)}
                        className="rounded border-white/20"
                      />
                      Post review to GitHub
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoApprove}
                        onChange={(e) => setAutoApprove(e.target.checked)}
                        className="rounded border-white/20"
                      />
                      Auto-approve if clean
                    </label>
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
                  {message ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      {message}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitting || !prUrl.trim()}
                      size="lg"
                      className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Reviewing…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Run Sentinel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </SentinelGlass>
            </form>
          </SentinelFade>
        </div>

        {/* History */}
        <SentinelFade delay={0.12}>
          <SentinelLabel index="RV">Reviews</SentinelLabel>
          <div className="space-y-2">
            {reviews.isLoading ? (
              <SentinelGlass className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading…
              </SentinelGlass>
            ) : reviews.isError ? (
              <SentinelGlass className="px-4 py-6 text-center text-xs text-amber-300/90">
                {reviews.error instanceof Error
                  ? reviews.error.message
                  : "Could not load"}
              </SentinelGlass>
            ) : !reviews.data?.reviews.length ? (
              <SentinelGlass className="px-4 py-10 text-center">
                <Shield className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">
                  No PR reviews yet.
                </p>
              </SentinelGlass>
            ) : (
              reviews.data.reviews.map((r, i) => {
                const pending = ["queued", "running"].includes(r.status);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link
                      href={`/app/sentinel/${r.id}`}
                      className="group block"
                    >
                      <SentinelGlass className="p-3.5 transition duration-300 group-hover:border-amber-400/25 group-hover:bg-white/[0.05]">
                        <p className="truncate text-sm font-medium text-white">
                          {r.title || "PR review"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-foreground/40">
                          {r.prUrl || "—"}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[10px] text-foreground/35">
                            {r.verdict ?? "—"}
                            {r.findingCount != null
                              ? ` · ${r.findingCount} findings`
                              : ""}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              r.status === "succeeded" &&
                                "bg-amber-400/15 text-amber-300",
                              r.status === "failed" &&
                                "bg-red-400/15 text-red-300",
                              pending &&
                                "animate-pulse bg-amber-400/15 text-amber-300",
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                      </SentinelGlass>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </SentinelFade>
      </div>
    </div>
  );
}

export default function SentinelPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-foreground/50">Loading Sentinel…</div>
      }
    >
      <SentinelInner />
    </Suspense>
  );
}
