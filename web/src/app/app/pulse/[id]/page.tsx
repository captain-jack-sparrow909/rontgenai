"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Columns3,
  Lightbulb,
  Loader2,
  Send,
} from "lucide-react";
import { ChatBubble } from "@/components/pulse/message";
import { PulseChart } from "@/components/pulse/chart";
import {
  PulseAtmosphere,
  PulseFade,
  PulseGlass,
  PulseLabel,
} from "@/components/pulse/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  chatPulseSession,
  getPulseSession,
  type PulseChatMessage,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PulseSessionPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<PulseChatMessage[] | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["pulse-session", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getPulseSession(token, id);
    },
    refetchInterval: (q) => {
      const status = q.state.data?.session.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const session = query.data?.session;
  const messages = localMessages ?? session?.messages ?? [];
  const pending =
    session?.status === "queued" || session?.status === "running";

  useEffect(() => {
    if (session?.messages && !sending) {
      setLocalMessages(null);
    }
  }, [session?.messages, sending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function onSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    setInput("");

    const optimistic: PulseChatMessage = {
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages([...(session?.messages ?? []), optimistic]);

    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      const res = await chatPulseSession(token, id, message);
      setLocalMessages([
        ...(session?.messages ?? []),
        optimistic,
        res.message,
      ]);
      await queryClient.invalidateQueries({ queryKey: ["pulse-session", id] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("Pulse limit reached. Upgrade on Billing.");
      } else {
        setError(err instanceof Error ? err.message : "Chat failed");
      }
      setLocalMessages(session?.messages ?? []);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <PulseAtmosphere />

      <PulseFade>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/pulse">
              <ArrowLeft className="h-4 w-4" />
              Sessions
            </Link>
          </Button>
          {session ? (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                session.status === "succeeded" &&
                  "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                session.status === "failed" &&
                  "border-red-400/30 bg-red-400/10 text-red-300",
                pending &&
                  "animate-pulse border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
              )}
            >
              {session.status}
            </span>
          ) : null}
        </div>
      </PulseFade>

      {query.isLoading ? (
        <PulseGlass className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm text-foreground/50">Loading session…</span>
        </PulseGlass>
      ) : query.isError ? (
        <PulseGlass className="p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load"}
        </PulseGlass>
      ) : session ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Schema sidebar */}
          <PulseFade delay={0.05} className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {session.title}
              </h1>
              <p className="mt-1 text-xs text-foreground/40">
                {session.filename}
                {session.profile
                  ? ` · ${session.profile.rowCount.toLocaleString()} × ${session.profile.columnCount}`
                  : ""}
              </p>
            </div>

            {session.profile ? (
              <>
                <PulseLabel index="SC">Schema</PulseLabel>
                <PulseGlass className="max-h-[360px] overflow-y-auto p-3">
                  <ul className="space-y-2">
                    {session.profile.columns.map((c) => (
                      <li
                        key={c.name}
                        className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs text-emerald-100/90">
                            {c.name}
                          </span>
                          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-foreground/40">
                            {c.type}
                          </span>
                        </div>
                        {c.mean != null ? (
                          <p className="mt-1 text-[10px] text-foreground/35">
                            μ {c.mean} · [{c.min}–{c.max}]
                          </p>
                        ) : c.sampleValues?.length ? (
                          <p className="mt-1 truncate text-[10px] text-foreground/35">
                            e.g. {c.sampleValues.slice(0, 2).join(", ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </PulseGlass>
              </>
            ) : null}

            {session.bootstrap?.key_insights?.length ? (
              <>
                <PulseLabel index="KI">Key insights</PulseLabel>
                <PulseGlass className="space-y-2 p-3">
                  {session.bootstrap.key_insights.map((ins) => (
                    <div
                      key={ins}
                      className="flex gap-2 text-xs leading-relaxed text-foreground/65"
                    >
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
                      {ins}
                    </div>
                  ))}
                </PulseGlass>
              </>
            ) : null}
          </PulseFade>

          {/* Chat main */}
          <PulseFade delay={0.1} className="flex min-h-[70vh] flex-col">
            <PulseGlass glow className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">
                  Analysis chat
                </span>
                <Columns3 className="ml-auto h-3.5 w-3.5 text-foreground/30" />
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                {pending ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        Profiling dataset…
                      </p>
                      <p className="mt-1 text-xs text-foreground/45">
                        Inferring schema and drafting first insights
                      </p>
                    </div>
                  </div>
                ) : null}

                {session.status === "failed" ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {session.error || "Session failed"}
                  </div>
                ) : null}

                {session.bootstrap?.chart && !messages.length ? (
                  <PulseChart chart={session.bootstrap.chart} />
                ) : null}

                {messages.map((m, i) => (
                  <motion.div
                    key={`${m.createdAt}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ChatBubble message={m} />
                  </motion.div>
                ))}

                {sending ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-300/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Pulse is thinking…
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              {session.bootstrap?.suggested_questions?.length &&
              session.status === "succeeded" ? (
                <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-4 py-2.5">
                  {session.bootstrap.suggested_questions
                    .slice(0, 4)
                    .map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={sending}
                        onClick={() => void onSend(q)}
                        className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[11px] text-emerald-200/80 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
                      >
                        {q}
                      </button>
                    ))}
                </div>
              ) : null}

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
                className="flex items-end gap-2 border-t border-white/5 p-3 sm:p-4"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  disabled={session.status !== "succeeded" || sending}
                  placeholder={
                    session.status === "succeeded"
                      ? "Ask about trends, totals, segments…"
                      : "Waiting for profile…"
                  }
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50"
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
                    !input.trim() || sending || session.status !== "succeeded"
                  }
                  className="h-11 shrink-0 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/20 hover:brightness-110"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </PulseGlass>
          </PulseFade>
        </div>
      ) : null}
    </div>
  );
}
