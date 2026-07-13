"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  GitBranch,
  Loader2,
  Map,
  Sparkles,
  Star,
} from "lucide-react";
import {
  AtlasAtmosphere,
  AtlasFade,
  AtlasGlass,
  AtlasLabel,
} from "@/components/atlas/shell";
import { Button } from "@/components/ui/button";
import { ApiError, createAtlasMap, listAtlasMaps } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

export default function AtlasPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [repoUrl, setRepoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.atlas;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const maps = useQuery({
    queryKey: ["atlas-maps"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listAtlasMaps(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.maps ?? [];
      const pending = items.some((m) =>
        ["queued", "running"].includes(m.status),
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
        const res = await createAtlasMap(token, repoUrl.trim());
        await queryClient.invalidateQueries({ queryKey: ["atlas-maps"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/atlas/${res.map.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Atlas limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to map repo");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [getToken, queryClient, repoUrl, router],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <AtlasAtmosphere />

      <AtlasFade>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                Repo cartography
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-violet-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-300 via-violet-400 to-purple-600 text-slate-950 shadow-lg shadow-violet-500/30">
                  <Map className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Atlas
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  Every public repo, mapped and explained
                </p>
              </div>
            </div>
          </div>

          <AtlasGlass className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-violet-300/80">
                {usage
                  ? `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">
              maps + questions / mo
            </p>
          </AtlasGlass>
        </div>
      </AtlasFade>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <AtlasFade delay={0.08}>
          <form onSubmit={onSubmit}>
            <AtlasGlass glow>
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Map a repository
                  </h2>
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  Public GitHub only in v1. We fetch tree, README, and entry
                  files, then generate architecture + onboarding.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    GitHub URL or owner/repo
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/vercel/next.js"
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder:text-foreground/30 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    "vercel/next.js",
                    "facebook/react",
                    "withastro/astro",
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setRepoUrl(`https://github.com/${ex}`)}
                      className="truncate rounded-lg border border-white/8 bg-white/[0.03] px-2 py-2 font-mono text-[10px] text-foreground/50 transition hover:border-violet-400/30 hover:text-violet-200"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}{" "}
                    {error.includes("Upgrade") ? (
                      <Link
                        href="/app/billing"
                        className="font-medium underline underline-offset-2"
                      >
                        Open billing
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-foreground/35">
                    Optional: set GITHUB_TOKEN on API for higher rate limits
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting || !repoUrl.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-violet-400 to-purple-500 text-slate-950 shadow-lg shadow-violet-500/25 hover:brightness-110"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate map
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </AtlasGlass>
          </form>
        </AtlasFade>

        <AtlasFade delay={0.12}>
          <AtlasLabel index="MP">Maps</AtlasLabel>
          <div className="space-y-2">
            {maps.isLoading ? (
              <AtlasGlass className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading…
              </AtlasGlass>
            ) : maps.isError ? (
              <AtlasGlass className="px-4 py-6 text-center text-xs text-amber-300/90">
                {maps.error instanceof Error
                  ? maps.error.message
                  : "Could not load maps"}
              </AtlasGlass>
            ) : !maps.data?.maps.length ? (
              <AtlasGlass className="px-4 py-10 text-center">
                <Map className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">
                  No maps yet. Paste a public repo to start.
                </p>
              </AtlasGlass>
            ) : (
              maps.data.maps.map((m, i) => {
                const pending = ["queued", "running"].includes(m.status);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link href={`/app/atlas/${m.id}`} className="group block">
                      <AtlasGlass className="p-3.5 transition duration-300 group-hover:border-violet-400/25 group-hover:bg-white/[0.05]">
                        <p className="truncate text-sm font-medium text-white">
                          {m.fullName}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground/40">
                          {m.language ? <span>{m.language}</span> : null}
                          {m.stars != null ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3" />
                              {m.stars.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/30">
                            {new Date(m.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              m.status === "succeeded" &&
                                "bg-violet-400/15 text-violet-300",
                              m.status === "failed" &&
                                "bg-red-400/15 text-red-300",
                              pending &&
                                "animate-pulse bg-violet-400/15 text-violet-300",
                            )}
                          >
                            {m.status}
                          </span>
                        </div>
                      </AtlasGlass>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </AtlasFade>
      </div>
    </div>
  );
}
