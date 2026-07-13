"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  FileImage,
  Layers,
  Loader2,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  BlueprintAtmosphere,
  FadeIn,
  GlassPanel,
  SectionLabel,
} from "@/components/blueprint/shell";
import { MiniScore } from "@/components/blueprint/score-ring";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createBlueprintReview,
  listBlueprintReviews,
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

type InputTab = "describe" | "mermaid" | "diagram";

export default function BlueprintPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mermaid, setMermaid] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<InputTab>("describe");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const usage = me?.usage?.blueprint;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, (usage.used / usage.limit) * 100)
      : 0;

  const history = useQuery({
    queryKey: ["blueprint-reviews"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return listBlueprintReviews(token);
    },
    refetchInterval: (q) => {
      const items = q.state.data?.reviews ?? [];
      const pending = items.some((r) =>
        ["queued", "running"].includes(r.status),
      );
      return pending ? 2500 : false;
    },
  });

  const onFile = useCallback(async (f: File | null) => {
    setFile(f);
    if (f) {
      const url = await fileToBase64(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Sign in required");

        let imageBase64: string | undefined;
        let imageContentType: string | undefined;
        let filename: string | undefined;
        if (file) {
          imageBase64 = await fileToBase64(file);
          imageContentType = file.type || "image/png";
          filename = file.name;
        }

        const res = await createBlueprintReview(token, {
          title: title.trim() || undefined,
          description: description.trim(),
          mermaid: mermaid.trim() || undefined,
          imageBase64,
          imageContentType,
          filename,
        });

        await queryClient.invalidateQueries({ queryKey: ["blueprint-reviews"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        router.push(`/app/blueprint/${res.review.id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 402) {
          setError("Blueprint limit reached this month. Upgrade on Billing.");
        } else {
          setError(err instanceof Error ? err.message : "Review failed");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [description, file, getToken, mermaid, queryClient, router, title],
  );

  const tabs: { id: InputTab; label: string; icon: typeof Code2 }[] = [
    { id: "describe", label: "Describe", icon: Sparkles },
    { id: "mermaid", label: "Mermaid", icon: Code2 },
    { id: "diagram", label: "Diagram", icon: FileImage },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      <BlueprintAtmosphere />

      <FadeIn>
        {/* Hero header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Architecture X-Ray
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/40 blur-xl" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/30">
                  <Layers className="h-6 w-6" />
                </span>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  Blueprint
                </h1>
                <p className="mt-0.5 text-sm text-foreground/50">
                  See through your systems — scalability, reliability, tradeoffs
                </p>
              </div>
            </div>
          </div>

          {/* Usage meter */}
          <GlassPanel className="min-w-[180px] px-4 py-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-foreground/40">
              <span>Quota</span>
              <span className="font-mono text-cyan-300/80">
                {usage
                  ? `${usage.used}/${usage.limit < 0 ? "∞" : usage.limit}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-foreground/35">this month</p>
          </GlassPanel>
        </div>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Composer */}
        <FadeIn delay={0.08}>
          <form onSubmit={onSubmit}>
            <GlassPanel glow className="overflow-hidden">
              <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white">
                    New review session
                  </h2>
                </div>
                <p className="mt-1 text-xs text-foreground/40">
                  Feed Blueprint your architecture. We return scores, SPOFs, and
                  concrete fixes.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                    System name
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Checkout service · multi-region"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>

                {/* Tabs */}
                <div>
                  <div className="mb-3 flex gap-1 rounded-xl border border-white/8 bg-black/25 p-1">
                    {tabs.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          className={cn(
                            "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
                            active
                              ? "text-cyan-100"
                              : "text-foreground/45 hover:text-foreground/70",
                          )}
                        >
                          {active ? (
                            <motion.span
                              layoutId="bp-tab"
                              className="absolute inset-0 rounded-lg bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 ring-1 ring-cyan-400/30"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                            />
                          ) : null}
                          <Icon className="relative h-3.5 w-3.5" />
                          <span className="relative hidden sm:inline">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "describe" ? (
                      <motion.div
                        key="describe"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={8}
                          placeholder={`Describe components, data stores, traffic, SLAs…\n\nExample:\n• API gateway → services → Postgres\n• Single region, ~10k DAU\n• No queue; sync AI calls on request path`}
                          className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-foreground/90 placeholder:text-foreground/28 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                        />
                      </motion.div>
                    ) : null}

                    {tab === "mermaid" ? (
                      <motion.div
                        key="mermaid"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#060a12]">
                          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
                            <span className="h-2 w-2 rounded-full bg-red-400/70" />
                            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                            <span className="ml-2 font-mono text-[10px] text-foreground/30">
                              diagram.mmd
                            </span>
                          </div>
                          <textarea
                            value={mermaid}
                            onChange={(e) => setMermaid(e.target.value)}
                            rows={10}
                            placeholder={"flowchart LR\n  Client --> API\n  API --> Queue\n  Queue --> Workers\n  Workers --> DB[(Postgres)]"}
                            className="w-full resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-cyan-100/85 placeholder:text-foreground/25 focus:outline-none"
                          />
                        </div>
                      </motion.div>
                    ) : null}

                    {tab === "diagram" ? (
                      <motion.div
                        key="diagram"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
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
                            if (f) void onFile(f);
                          }}
                          className={cn(
                            "relative overflow-hidden rounded-xl border-2 border-dashed transition",
                            dragOver
                              ? "border-cyan-400/60 bg-cyan-400/10"
                              : "border-white/12 bg-black/20 hover:border-cyan-400/35",
                          )}
                        >
                          {preview ? (
                            <div className="relative p-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview}
                                alt="Diagram preview"
                                className="mx-auto max-h-56 rounded-lg object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => void onFile(null)}
                                className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/60 p-1.5 text-white/80 backdrop-blur hover:bg-black/80"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <p className="mt-2 truncate text-center text-xs text-foreground/40">
                                {file?.name}
                              </p>
                            </div>
                          ) : (
                            <label className="flex cursor-pointer flex-col items-center gap-3 px-4 py-12">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
                                <Upload className="h-5 w-5 text-cyan-300" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-white/90">
                                  Drop architecture diagram
                                </p>
                                <p className="mt-1 text-xs text-foreground/40">
                                  PNG, JPEG, or WebP · up to 8MB
                                </p>
                              </div>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) =>
                                  void onFile(e.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Always show short description if on other tabs */}
                {tab !== "describe" ? (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/40">
                      Context notes
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional context if diagram is the main input…"
                      className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-foreground/90 placeholder:text-foreground/28 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                ) : null}

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
                    Powered by DeepSeek · results typically in under a minute
                  </p>
                  <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="relative overflow-hidden shadow-lg shadow-cyan-500/25"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Initializing scan…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Run Blueprint review
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </form>
        </FadeIn>

        {/* History sidebar */}
        <FadeIn delay={0.14} className="min-w-0">
          <SectionLabel index="HX">Mission log</SectionLabel>
          <div className="space-y-2">
            {history.isLoading ? (
              <GlassPanel className="px-4 py-8 text-center text-xs text-foreground/40">
                Loading sessions…
              </GlassPanel>
            ) : history.isError ? (
              <GlassPanel className="px-4 py-6 text-center text-xs text-amber-300/90">
                {history.error instanceof Error
                  ? history.error.message
                  : "Could not load history"}
              </GlassPanel>
            ) : !history.data?.reviews.length ? (
              <GlassPanel className="px-4 py-10 text-center">
                <Layers className="mx-auto mb-2 h-6 w-6 text-foreground/25" />
                <p className="text-xs text-foreground/40">
                  No scans yet. Your first review appears here.
                </p>
              </GlassPanel>
            ) : (
              history.data.reviews.map((r, i) => {
                const pending = ["queued", "running"].includes(r.status);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link
                      href={`/app/blueprint/${r.id}`}
                      className="group block"
                    >
                      <GlassPanel className="p-3.5 transition duration-300 group-hover:border-cyan-400/25 group-hover:bg-white/[0.05]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white group-hover:text-cyan-50">
                              {r.title || "Untitled scan"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-foreground/40">
                              {r.descriptionPreview || "Architecture review"}
                            </p>
                          </div>
                          {r.scores?.overall != null ? (
                            <MiniScore value={r.scores.overall} />
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/30">
                            {new Date(r.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              r.status === "succeeded" &&
                                "bg-emerald-400/15 text-emerald-300",
                              r.status === "failed" &&
                                "bg-red-400/15 text-red-300",
                              pending &&
                                "animate-pulse bg-cyan-400/15 text-cyan-300",
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                      </GlassPanel>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
