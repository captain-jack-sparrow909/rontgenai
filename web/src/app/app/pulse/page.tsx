"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  PulseAtmosphere,
  PulseFade,
  PulseGlass,
  PulseLabel,
} from "@/components/pulse/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createPulseSession,
  listPulseSessions,
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

export default function PulsePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = me?.usage?.pulse;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const sessions = useQuery({
    queryKey: ["pulse-sessions"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listPulseSessions(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.sessions ?? [];
      const pending = items.some((s) =>
        ["queued", "running"].includes(s.status),
      );
      return pending ? 2500 : false;
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) {
        setError("Choose a CSV or Excel file");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");
        const fileBase64 = await fileToBase64(file);
        const res = await createPulseSession(token, {
          title: title.trim() || undefined,
          filename: file.name,
          fileBase64,
          contentType: file.type || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["pulse-sessions"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/pulse/${res.session.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Pulse limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Upload failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [file, getToken, queryClient, router, title],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <PulseAtmosphere />

      <PulseFade>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Data signal
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-emerald-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/30">
                  <Activity className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Pulse
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  Chat with spreadsheets — insights, SQL, and charts
                </p>
              </div>
            </div>
          </div>

          <PulseGlass className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-emerald-300/80">
                {usage
                  ? `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">
              messages + uploads / mo
            </p>
          </PulseGlass>
        </div>
      </PulseFade>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <PulseFade delay={0.08}>
          <form onSubmit={onSubmit}>
            <PulseGlass glow>
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">
                    New data session
                  </h2>
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  Upload CSV or Excel. Pulse profiles columns, drafts insights,
                  then you chat with the data.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    Session name
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q1 revenue export"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
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
                    "relative overflow-hidden rounded-xl border-2 border-dashed transition",
                    dragOver
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "border-white/12 bg-black/20 hover:border-emerald-400/35",
                  )}
                >
                  {file ? (
                    <div className="flex items-center gap-3 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-full border border-white/15 bg-black/50 p-1.5 text-white/70 hover:bg-black/70"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-3 px-4 py-12">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
                        <Upload className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-white/90">
                          Drop CSV or Excel
                        </p>
                        <p className="mt-1 text-xs text-foreground/40">
                          .csv · .xlsx · .xls · up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
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
                    Read-only analysis · sample rows sent to the model
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting || !file}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Profiling…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Open in Pulse
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </PulseGlass>
          </form>
        </PulseFade>

        <PulseFade delay={0.12}>
          <PulseLabel index="SS">Sessions</PulseLabel>
          <div className="space-y-2">
            {sessions.isLoading ? (
              <PulseGlass className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading…
              </PulseGlass>
            ) : sessions.isError ? (
              <PulseGlass className="px-4 py-6 text-center text-xs text-amber-300/90">
                {sessions.error instanceof Error
                  ? sessions.error.message
                  : "Could not load sessions"}
              </PulseGlass>
            ) : !sessions.data?.sessions.length ? (
              <PulseGlass className="px-4 py-10 text-center">
                <Activity className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">
                  No sessions yet. Upload a spreadsheet to begin.
                </p>
              </PulseGlass>
            ) : (
              sessions.data.sessions.map((s, i) => {
                const pending = ["queued", "running"].includes(s.status);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link href={`/app/pulse/${s.id}`} className="group block">
                      <PulseGlass className="p-3.5 transition duration-300 group-hover:border-emerald-400/25 group-hover:bg-white/[0.05]">
                        <p className="truncate text-sm font-medium text-white">
                          {s.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-foreground/40">
                          {s.filename}
                          {s.rowCount != null
                            ? ` · ${s.rowCount.toLocaleString()} rows`
                            : ""}
                          {s.columnCount != null ? ` · ${s.columnCount} cols` : ""}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/30">
                            {new Date(s.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              s.status === "succeeded" &&
                                "bg-emerald-400/15 text-emerald-300",
                              s.status === "failed" &&
                                "bg-red-400/15 text-red-300",
                              pending &&
                                "animate-pulse bg-emerald-400/15 text-emerald-300",
                            )}
                          >
                            {s.status}
                          </span>
                        </div>
                      </PulseGlass>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </PulseFade>
      </div>
    </div>
  );
}
