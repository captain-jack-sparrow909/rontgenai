"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ChevronRight,
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

// ─── BlueprintGrid ────────────────────────────────────────────────────────────

function BlueprintGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "48px 48px",
      }}
    />
  );
}

// ─── BlueprintHero ────────────────────────────────────────────────────────────

function BlueprintHero({
  usageUsed,
  usageLimit,
  usagePct,
}: {
  usageUsed: number | undefined;
  usageLimit: number | undefined;
  usagePct: number;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-cyan-400/[0.14] bg-gradient-to-br from-[#070d1a] via-[#060910] to-[#05070d] p-6 sm:p-8">
      {/* Top glow line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent" />
      {/* Bottom glow line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/12 to-transparent" />

      {/* Decorative radar target — top-right */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 opacity-[0.06]">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[100, 76, 52, 28].map((r) => (
            <circle key={r} cx="120" cy="120" r={r} stroke="#22d3ee" strokeWidth="1" />
          ))}
          <line x1="20" y1="120" x2="220" y2="120" stroke="#22d3ee" strokeWidth="0.6" />
          <line x1="120" y1="20" x2="120" y2="220" stroke="#22d3ee" strokeWidth="0.6" />
          <circle cx="120" cy="20" r="4" fill="#22d3ee" />
          <circle cx="220" cy="120" r="4" fill="#22d3ee" />
          <circle cx="120" cy="220" r="4" fill="#22d3ee" />
          <circle cx="20" cy="120" r="4" fill="#22d3ee" />
          <line x1="62" y1="62" x2="178" y2="178" stroke="#22d3ee" strokeWidth="0.4" strokeDasharray="4 8" />
          <line x1="178" y1="62" x2="62" y2="178" stroke="#22d3ee" strokeWidth="0.4" strokeDasharray="4 8" />
        </svg>
      </div>

      {/* Scan beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden">
        <div className="blueprint-scan-beam absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — icon + title */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/25 blur-xl" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/30">
              <Layers className="h-7 w-7 text-slate-950" />
            </span>
            {/* Pulse rings around icon */}
            <span className="blueprint-radar absolute inset-[-6px] rounded-3xl border border-cyan-400/30" />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400">
                Architecture X-Ray · Live
              </span>
            </div>

            <h1
              className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
              style={{
                fontFamily:
                  "var(--font-rajdhani), var(--font-geist-sans), system-ui, sans-serif",
                backgroundImage:
                  "linear-gradient(135deg, #e0f9ff 0%, #22d3ee 35%, #60a5fa 80%)",
              }}
            >
              Blueprint
            </h1>
            <p className="mt-1 text-[13px] text-foreground/42">
              See through your systems — scalability, reliability, tradeoffs
            </p>
          </div>
        </div>

        {/* Right — quota meter */}
        <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-black/35 px-5 py-4 sm:min-w-[180px]">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-cyan-400/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                Quota
              </span>
            </div>
            <span className="font-mono text-[11px] text-cyan-300/75">
              {usageUsed !== undefined
                ? `${usageUsed} / ${usageLimit! < 0 ? "∞" : usageLimit}`
                : "— / —"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${usagePct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-foreground/28">this month</p>
        </div>
      </div>
    </div>
  );
}

// ─── BlueprintPage ────────────────────────────────────────────────────────────

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

  const tabs: {
    id: InputTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hint: string;
  }[] = [
    { id: "describe", label: "Describe", icon: Sparkles, hint: "Plain language" },
    { id: "mermaid", label: "Mermaid", icon: Code2, hint: "flowchart / sequenceDiagram" },
    { id: "diagram", label: "Diagram", icon: FileImage, hint: "PNG / JPEG / WebP" },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      <BlueprintAtmosphere />
      <BlueprintGrid />

      <FadeIn>
        <BlueprintHero
          usageUsed={usage?.used}
          usageLimit={usage?.limit}
          usagePct={usagePct}
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1fr_296px]">
        {/* ── Composer ─────────────────────────────────────────────────── */}
        <FadeIn delay={0.08}>
          <form onSubmit={onSubmit}>
            {/* Terminal window */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#060910]">
              {/* Top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/28 to-transparent" />

              {/* Window chrome */}
              <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#040609]/90 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/65" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/65" />
                  <span className="ml-3 font-mono text-[10px] text-foreground/28">
                    blueprint.session
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-cyan-400/50" />
                  <span className="font-mono text-[10px] font-semibold tracking-widest text-cyan-400/50">
                    READY
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {/* System name */}
                <div>
                  <label className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-cyan-400/55">SYS://</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      System name
                    </span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Checkout service · multi-region"
                    maxLength={200}
                    className="w-full rounded-xl border border-white/[0.07] bg-black/45 px-4 py-3 text-sm text-white placeholder:text-foreground/22 transition focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                  />
                </div>

                {/* Input-mode tabs */}
                <div>
                  <div className="mb-4 flex gap-1 overflow-hidden rounded-xl border border-white/[0.06] bg-black/45 p-1">
                    {tabs.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          className={cn(
                            "group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs transition",
                            active
                              ? "text-cyan-100"
                              : "text-foreground/38 hover:text-foreground/62",
                          )}
                        >
                          {active ? (
                            <motion.span
                              layoutId="bp-tab-pill"
                              className="absolute inset-0 rounded-lg bg-gradient-to-b from-cyan-500/[0.16] to-cyan-600/[0.04] shadow-inner ring-1 ring-inset ring-cyan-400/22"
                              transition={{
                                type: "spring",
                                bounce: 0.16,
                                duration: 0.36,
                              }}
                            />
                          ) : null}
                          <Icon className="relative h-4 w-4" />
                          <span className="relative hidden text-[10px] font-semibold sm:block">
                            {t.label}
                          </span>
                          <span className="relative hidden text-[9px] text-foreground/28 sm:block">
                            {t.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {/* ── Describe tab ── */}
                    {tab === "describe" ? (
                      <motion.div
                        key="describe"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                      >
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={9}
                          placeholder={`Describe components, data stores, traffic, SLAs…\n\nExample:\n• API gateway → 3 microservices → Postgres\n• Single region, ~10k DAU\n• No message queue; sync AI calls in request path\n• No CDN; static assets served from origin`}
                          className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/40 px-4 py-3 text-sm leading-relaxed text-foreground/88 placeholder:text-foreground/22 transition focus:border-cyan-400/38 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                        />
                      </motion.div>
                    ) : null}

                    {/* ── Mermaid tab ── */}
                    {tab === "mermaid" ? (
                      <motion.div
                        key="mermaid"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
                      >
                        <div className="overflow-hidden rounded-xl border border-cyan-400/[0.13] bg-[#030508]">
                          {/* Editor chrome */}
                          <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#020406] px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-3 w-3 text-cyan-400/60" />
                              <span className="font-mono text-[10px] text-foreground/32">
                                diagram.mmd
                              </span>
                            </div>
                            <span className="rounded bg-cyan-400/[0.09] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-400/65">
                              Mermaid
                            </span>
                          </div>
                          {/* Line numbers + code area */}
                          <div className="flex">
                            <div className="select-none border-r border-white/[0.04] bg-black/25 px-3 py-3 text-right font-mono text-[11px] leading-[1.7rem] text-foreground/18">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
                            <textarea
                              value={mermaid}
                              onChange={(e) => setMermaid(e.target.value)}
                              rows={10}
                              placeholder={
                                "flowchart LR\n  Client --> API\n  API --> Queue\n  Queue --> Workers\n  Workers --> DB[(Postgres)]"
                              }
                              className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-[1.7rem] text-cyan-100/82 placeholder:text-foreground/20 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : null}

                    {/* ── Diagram tab ── */}
                    {tab === "diagram" ? (
                      <motion.div
                        key="diagram"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16 }}
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
                            "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                            dragOver
                              ? "border-cyan-400/55 bg-cyan-400/[0.07]"
                              : "border-white/[0.09] bg-black/22 hover:border-cyan-400/28",
                          )}
                        >
                          {preview ? (
                            <div className="relative p-4">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview}
                                alt="Diagram preview"
                                className="mx-auto max-h-56 rounded-lg object-contain ring-1 ring-white/[0.08]"
                              />
                              <button
                                type="button"
                                onClick={() => void onFile(null)}
                                className="absolute right-5 top-5 rounded-full border border-white/12 bg-black/70 p-1.5 text-white/75 backdrop-blur transition hover:bg-red-500/30 hover:text-red-300"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <p className="mt-2 truncate text-center font-mono text-[11px] text-foreground/32">
                                {file?.name}
                              </p>
                            </div>
                          ) : (
                            <label className="flex cursor-pointer flex-col items-center gap-4 px-4 py-14">
                              {/* Radar rings drop indicator */}
                              <div className="relative flex h-16 w-16 items-center justify-center">
                                <div className="blueprint-radar absolute inset-0 rounded-full border border-cyan-400/28" />
                                <div className="blueprint-radar-delay absolute inset-0 rounded-full border border-cyan-400/16" />
                                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06]">
                                  <Upload className="h-5 w-5 text-cyan-300/80" />
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-white/88">
                                  Drop architecture diagram
                                </p>
                                <p className="mt-1 text-xs text-foreground/35">
                                  PNG, JPEG, or WebP · up to 8 MB
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

                {/* Context notes (non-describe tabs) */}
                {tab !== "describe" ? (
                  <div>
                    <label className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-cyan-400/55">OPT://</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                        Context notes
                      </span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional context alongside your diagram or code…"
                      className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/40 px-4 py-3 text-sm text-foreground/88 placeholder:text-foreground/22 transition focus:border-cyan-400/38 focus:outline-none focus:ring-2 focus:ring-cyan-400/12"
                    />
                  </div>
                ) : null}

                {/* Error */}
                {error ? (
                  <div className="rounded-xl border border-red-500/28 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
                    {error}{" "}
                    {error.includes("Upgrade") ? (
                      <Link
                        href="/app/billing"
                        className="font-medium underline underline-offset-2 transition hover:text-red-200"
                      >
                        Open billing →
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {/* Submit row */}
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-foreground/28">
                    Powered by DeepSeek · typically under 60 s
                  </p>
                  <div className="relative">
                    {/* Rotating gradient border when idle */}
                    {!submitting && (
                      <div
                        className="absolute -inset-[2px] rounded-xl opacity-70"
                        style={{
                          background:
                            "conic-gradient(from var(--bp-angle, 0deg), #22d3ee, #3b82f6, #8b5cf6, #22d3ee)",
                          animation: "bp-conic-spin 3s linear infinite",
                        }}
                      />
                    )}
                    <Button
                      type="submit"
                      disabled={submitting}
                      size="lg"
                      className="relative z-10 min-w-[210px] border-0 bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500"
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
              </div>
            </div>
          </form>
        </FadeIn>

        {/* ── Mission Log sidebar ──────────────────────────────────────── */}
        <FadeIn delay={0.14} className="min-w-0">
          {/* Section header */}
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400/55">
              SYS:LOG
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/18 to-transparent" />
            {history.data?.reviews.length ? (
              <span className="font-mono text-[10px] text-foreground/28">
                {history.data.reviews.length} sessions
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {history.isLoading ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#060910] px-4 py-10 text-center">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400/45" />
                <p className="text-xs text-foreground/32">Loading sessions…</p>
              </div>
            ) : history.isError ? (
              <div className="rounded-2xl border border-amber-500/22 bg-amber-500/[0.05] px-4 py-6 text-center text-xs text-amber-300/75">
                {history.error instanceof Error
                  ? history.error.message
                  : "Could not load history"}
              </div>
            ) : !history.data?.reviews.length ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] bg-[#060910]/60 px-4 py-14 text-center">
                <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                  <div className="blueprint-radar absolute inset-0 rounded-full border border-cyan-400/22" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05]">
                    <Layers className="h-5 w-5 text-cyan-400/45" />
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground/38">No scans yet</p>
                <p className="mt-1 text-[11px] text-foreground/20">
                  Your first review appears here.
                </p>
              </div>
            ) : (
              history.data.reviews.map((r, i) => {
                const pending = ["queued", "running"].includes(r.status);

                const statusStyle = r.status === "succeeded"
                  ? "text-emerald-400 bg-emerald-400/[0.09] ring-1 ring-emerald-400/20"
                  : r.status === "failed"
                    ? "text-red-400 bg-red-400/[0.09] ring-1 ring-red-400/20"
                    : "animate-pulse text-cyan-400 bg-cyan-400/[0.09] ring-1 ring-cyan-400/20";

                const leftBorder = r.status === "succeeded"
                  ? "border-l-emerald-500/50"
                  : r.status === "failed"
                    ? "border-l-red-500/45"
                    : "border-l-cyan-400/55";

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.32 }}
                  >
                    <Link
                      href={`/app/blueprint/${r.id}`}
                      className="group block"
                    >
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-xl border border-l-2 border-white/[0.06] bg-[#060910] p-3.5 transition-all duration-200 group-hover:border-white/[0.11] group-hover:bg-white/[0.025]",
                          leftBorder,
                        )}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-white/82 transition group-hover:text-white">
                              {r.title || "Untitled scan"}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-foreground/35">
                              {r.descriptionPreview || "Architecture review"}
                            </p>
                          </div>
                          {r.scores?.overall != null ? (
                            <MiniScore value={r.scores.overall} />
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-foreground/25">
                            {new Date(r.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                              statusStyle,
                            )}
                          >
                            {pending ? "scanning" : r.status}
                          </span>
                        </div>

                        {/* Hover arrow */}
                        <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/18 opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </FadeIn>
      </div>

      {/* CSS for conic-gradient spin on submit button */}
      <style>{`
        @property --bp-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes bp-conic-spin {
          to { --bp-angle: 360deg; }
        }
      `}</style>
    </div>
  );
}
