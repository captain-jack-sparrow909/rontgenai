"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  Loader2,
  Radar as RadarIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  RadarAtmosphere,
  RadarFade,
  RadarGlass,
  RadarLabel,
} from "@/components/radar/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createRadarInvestigation,
  listRadarInvestigations,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function RadarPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricsNotes, setMetricsNotes] = useState("");
  const [logs, setLogs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.radar;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const list = useQuery({
    queryKey: ["radar-investigations"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listRadarInvestigations(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.investigations ?? [];
      const pending = items.some((i) =>
        ["queued", "running"].includes(i.status),
      );
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!logs.trim() && !file) {
        setError("Paste logs or upload a log file");
        return;
      }
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");

        let logBase64: string | undefined;
        let filename: string | undefined;
        if (file) {
          logBase64 = await fileToBase64(file);
          filename = file.name;
        }

        const res = await createRadarInvestigation(token, {
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          metricsNotes: metricsNotes.trim() || undefined,
          logs: logs.trim() || undefined,
          logBase64,
          filename,
        });

        await queryClient.invalidateQueries({
          queryKey: ["radar-investigations"],
        });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/radar/${res.investigation.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Radar limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Investigation failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      description,
      file,
      getToken,
      logs,
      metricsNotes,
      queryClient,
      router,
      title,
    ],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <RadarAtmosphere />

      <RadarFade>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
                Incident RCA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-red-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-300 via-red-400 to-rose-600 text-slate-950 shadow-lg shadow-red-500/30">
                  <RadarIcon className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Radar
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  Find the root cause before the war room ends
                </p>
              </div>
            </div>
          </div>

          <RadarGlass className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-red-300/80">
                {usage
                  ? `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">
              investigations / mo
            </p>
          </RadarGlass>
        </div>
      </RadarFade>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <RadarFade delay={0.08}>
          <form onSubmit={onSubmit}>
            <RadarGlass glow>
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-400" />
                  <h2 className="text-sm font-semibold text-white">
                    New investigation
                  </h2>
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  Paste production logs (and optional metrics notes). Radar
                  extracts signals and ranks root causes.
                </p>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Incident title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Checkout 5xx spike · 14:32 UTC"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Context
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What users saw, deploy windows, recent changes…"
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Metrics / traces notes (optional)
                  </label>
                  <textarea
                    value={metricsNotes}
                    onChange={(e) => setMetricsNotes(e.target.value)}
                    rows={2}
                    placeholder="CPU 90%, p99 latency 4s, DB connections saturated…"
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Logs
                  </label>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0608]">
                    <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-red-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-2 font-mono text-[10px] text-foreground/30">
                        incident.log
                      </span>
                    </div>
                    <textarea
                      value={logs}
                      onChange={(e) => setLogs(e.target.value)}
                      rows={10}
                      placeholder={`2024-01-15T14:32:01Z ERROR [checkout] payment timeout upstream=stripe latency=3001ms\n2024-01-15T14:32:02Z WARN  [api-gateway] circuit_open service=payments`}
                      className="w-full resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-red-100/80 placeholder:text-foreground/25 focus:outline-none"
                    />
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                  }}
                  className={cn(
                    "rounded-xl border-2 border-dashed transition",
                    dragOver
                      ? "border-red-400/60 bg-red-400/10"
                      : "border-white/12 bg-black/20 hover:border-red-400/35",
                  )}
                >
                  {file ? (
                    <div className="flex items-center gap-3 p-4">
                      <FileText className="h-5 w-5 text-red-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{file.name}</p>
                        <p className="text-xs text-foreground/40">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-full border border-white/15 p-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 px-4 py-8">
                      <Upload className="h-5 w-5 text-red-300/80" />
                      <span className="text-xs text-foreground/45">
                        Or drop a .log / .txt file
                      </span>
                      <input
                        type="file"
                        accept=".log,.txt,text/plain"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}{" "}
                    {error.includes("Billing") ? (
                      <Link href="/app/billing" className="underline">
                        Billing
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="bg-gradient-to-r from-red-400 to-rose-500 text-slate-950 shadow-lg shadow-red-500/25 hover:brightness-110"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Scanning…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Investigate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </RadarGlass>
          </form>
        </RadarFade>

        <RadarFade delay={0.12}>
          <RadarLabel index="HX">History</RadarLabel>
          <div className="space-y-2">
            {list.isLoading ? (
              <RadarGlass className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading…
              </RadarGlass>
            ) : list.isError ? (
              <RadarGlass className="px-4 py-6 text-center text-xs text-amber-300/90">
                {list.error instanceof Error
                  ? list.error.message
                  : "Could not load"}
              </RadarGlass>
            ) : !list.data?.investigations.length ? (
              <RadarGlass className="px-4 py-10 text-center">
                <RadarIcon className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">
                  No investigations yet.
                </p>
              </RadarGlass>
            ) : (
              list.data.investigations.map((inv, i) => {
                const pending = ["queued", "running"].includes(inv.status);
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link
                      href={`/app/radar/${inv.id}`}
                      className="group block"
                    >
                      <RadarGlass className="p-3.5 transition duration-300 group-hover:border-red-400/25 group-hover:bg-white/[0.05]">
                        <p className="truncate text-sm font-medium text-white">
                          {inv.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-foreground/40">
                          {inv.errorCount != null
                            ? `${inv.errorCount} errors`
                            : "—"}
                          {inv.totalLines != null
                            ? ` · ${inv.totalLines} lines`
                            : ""}
                          {inv.severity ? ` · ${inv.severity}` : ""}
                        </p>
                        <div className="mt-2.5 flex justify-between">
                          <span className="font-mono text-[10px] text-foreground/30">
                            {new Date(inv.createdAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              inv.status === "succeeded" &&
                                "bg-red-400/15 text-red-300",
                              inv.status === "failed" &&
                                "bg-white/10 text-foreground/50",
                              pending &&
                                "animate-pulse bg-red-400/15 text-red-300",
                            )}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </RadarGlass>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </RadarFade>
      </div>
    </div>
  );
}
