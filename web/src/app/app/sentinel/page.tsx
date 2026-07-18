"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GitPullRequest,
  Loader2,
  LockKeyhole,
  Settings2,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  SentinelAtmosphere,
  SentinelFade,
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

/* ─────────────────────────── static data ─────────────────────────── */

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "INTEGRATION", value: "GitHub App" },
  { label: "SCOPE", value: "Diff + Context" },
  { label: "OUTPUT", value: "Inline Comments" },
] as const;

const CAPABILITIES = [
  "Inline Review",
  "Severity Scoring",
  "Bug Detection",
  "Security Flags",
  "Style Issues",
  "Performance",
  "GitHub Comments",
  "Auto-Approve",
] as const;

/* ─────────────────────────── decorative components ──────────────────── */

/** Diamond / shield-grid background texture */
function ShieldGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "repeating-linear-gradient(45deg,rgba(251,191,36,0.018) 0px,rgba(251,191,36,0.018) 1px,transparent 1px,transparent 28px)",
          "repeating-linear-gradient(-45deg,rgba(251,191,36,0.018) 0px,rgba(251,191,36,0.018) 1px,transparent 1px,transparent 28px)",
        ].join(","),
      }}
    />
  );
}

/** Ambient glow blobs */
function ShieldAmbience() {
  return (
    <>
      <div
        className="pointer-events-none fixed left-[8%] top-[18%] -z-10 h-[460px] w-[460px] rounded-full opacity-[0.032] blur-[100px]"
        style={{ background: "radial-gradient(circle,#fbbf24,transparent 70%)" }}
      />
      <div
        className="pointer-events-none fixed bottom-[12%] right-[6%] -z-10 h-[380px] w-[380px] rounded-full opacity-[0.028] blur-[90px]"
        style={{ background: "radial-gradient(circle,#f97316,transparent 70%)" }}
      />
    </>
  );
}

/** Shield SVG with animated pulsing rings — hero decoration */
function ShieldDecoration() {
  return (
    <div className="pointer-events-none absolute -right-6 -top-6 h-72 w-72 overflow-hidden opacity-[0.065]">
      <svg viewBox="0 0 220 220" fill="none" className="h-full w-full">
        {/* Outer rings */}
        <circle cx="110" cy="102" r="95" stroke="#fbbf24" strokeWidth="0.6" />
        <circle cx="110" cy="102" r="78" stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="6 9" />
        <circle cx="110" cy="102" r="60" stroke="#fbbf24" strokeWidth="0.5" />
        {/* Shield body */}
        <path
          d="M 110 26 L 178 58 L 178 108 Q 178 160 110 188 Q 42 160 42 108 L 42 58 Z"
          stroke="#fbbf24"
          strokeWidth="1.2"
          fill="rgba(251,191,36,0.08)"
        />
        {/* Checkmark */}
        <path
          d="M 86 102 L 100 118 L 134 82"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Horizontal scan lines */}
        <line x1="42" y1="96" x2="178" y2="96" stroke="#fbbf24" strokeWidth="0.4" strokeDasharray="4 6" />
        <line x1="46" y1="112" x2="174" y2="112" stroke="#fbbf24" strokeWidth="0.4" strokeDasharray="4 6" />
        {/* Scan beam */}
        <line
          x1="42"
          y1="102"
          x2="178"
          y2="102"
          stroke="#fbbf24"
          strokeWidth="0.8"
          strokeOpacity="0.6"
          style={{ animation: "sn-scan-beam 2.8s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

/** Scanning overlay shown while submitting */
function ScanningOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-2xl"
          style={{ background: "rgba(5,7,13,0.88)", backdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Shield rings */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-amber-400/30"
                initial={{ width: 48, height: 48, opacity: 0.6 }}
                animate={{ width: 48 + i * 24, height: 48 + i * 24, opacity: 0 }}
                transition={{ duration: 1.8, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10"
            >
              <Shield className="h-6 w-6 text-amber-300" />
            </motion.div>
          </div>
          {/* Fake diff lines scanning */}
          <div className="flex w-56 flex-col gap-1.5 opacity-60">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full bg-amber-400/20"
                style={{ width: `${55 + i * 8}%` }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1 + i * 0.12, duration: 0.4 }}
              />
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/70">
            Scanning PR diff…
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Styled toggle switch */
function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-5 w-8 flex-shrink-0 items-center rounded-full px-0.5 transition-colors duration-200",
        checked ? "bg-amber-500/70" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-3" : "translate-x-0",
        )}
      />
    </div>
  );
}

/** Toggle pill option for form checkboxes */
function ToggleOption({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-2 text-left transition duration-200",
        checked
          ? "border-amber-400/30 bg-amber-400/[0.08] text-amber-100/80"
          : "border-white/[0.07] bg-black/20 text-foreground/40 hover:border-amber-400/18 hover:text-foreground/60",
      )}
    >
      <span className="text-[11px] opacity-60">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      <ToggleSwitch checked={checked} />
    </button>
  );
}

/* ─────────────────────────── inner page ─────────────────────────── */

function SentinelInner() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [prUrl, setPrUrl] = useState("");
  const [postToGithub, setPostToGithub] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [reviewFocus, setReviewFocus] = useState<"general" | "security">("general");
  const [securityContext, setSecurityContext] = useState("");
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

  /* Auto-claim installation_id from GitHub App setup redirect */
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
          reviewFocus,
          securityContext:
            reviewFocus === "security"
              ? securityContext.trim() || undefined
              : undefined,
          installationId: installationId ? Number(installationId) : undefined,
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
    [autoApprove, getToken, installationId, postToGithub, prUrl, queryClient, reviewFocus, router, securityContext],
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
    <>
      <style>{`
        @property --sn-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes sn-conic-spin { to { --sn-angle: 360deg; } }
        @keyframes sn-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
          50%       { box-shadow: 0 0 22px 2px rgba(251,191,36,0.055); }
        }
        @keyframes sn-scan-beam {
          0%        { transform: translateY(-38px); opacity: 0; }
          15%, 85%  { opacity: 1; }
          100%      { transform: translateY(38px); opacity: 0; }
        }
        @keyframes sn-ring-pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <ShieldGrid />
      <ShieldAmbience />
      <SentinelAtmosphere />

      <div className="relative mx-auto max-w-5xl">

        {/* ── HERO ── */}
        <SentinelFade>
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]"
            style={{ animation: "sn-border-breathe 5s ease-in-out infinite" }}>
            <ShieldDecoration />

            {/* gradient shelf */}
            <div
              className="absolute inset-x-0 top-0 h-px opacity-50"
              style={{ background: "linear-gradient(to right,transparent,rgba(251,191,36,0.5),transparent)" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-32 opacity-[0.04]"
              style={{ background: "linear-gradient(to top,rgba(251,191,36,1),transparent)" }}
            />

            <div className="relative z-10 px-6 py-7 sm:px-8 sm:py-9">
              {/* badge + title row */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                      PR guardian
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-xl" />
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
                        <Shield className="h-7 w-7 text-slate-950" />
                      </span>
                    </div>
                    <div>
                      <h1
                        className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
                        style={{ backgroundImage: "linear-gradient(to right,#fde68a,#fbbf24,#f97316)" }}
                      >
                        Sentinel
                      </h1>
                      <p className="mt-1 text-sm text-foreground/45">
                        PR reviews that ship with the team
                      </p>
                    </div>
                  </div>
                </div>

                {/* quota card */}
                <div className="min-w-[190px] rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3 backdrop-blur-sm">
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
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(to right,#fbbf24,#f97316)" }}
                      initial={{ width: 0 }}
                      animate={{ width: usage?.limit === 0 ? "0%" : `${usagePct}%` }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-foreground/35">PR reviews / month</p>

                  {status.data && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[
                        { label: "Token", ok: status.data.githubTokenConfigured },
                        { label: "App", ok: status.data.githubAppConfigured },
                        { label: status.data.plan ?? "Plan", ok: status.data.planAllows },
                      ].map((s) => (
                        <span
                          key={s.label}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            s.ok ? "bg-amber-400/15 text-amber-300" : "bg-white/8 text-foreground/30",
                          )}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* telemetry row */}
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-5">
                {TELEMETRY.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                      {t.label}
                    </span>
                    <ChevronRight className="h-2.5 w-2.5 text-foreground/20" />
                    <span className="font-mono text-[10px] text-amber-300/70">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SentinelFade>

        {/* ── CAPABILITY STRIP ── */}
        <SentinelFade delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            {CAPABILITIES.map((cap, i) => (
              <span key={cap} className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/35">
                {i > 0 && <span className="h-px w-3 bg-amber-400/20" />}
                {cap}
              </span>
            ))}
          </div>
        </SentinelFade>

        {/* ── MAIN GRID ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_296px]">

          {/* LEFT COLUMN: two panels */}
          <div className="flex flex-col gap-5">

            {/* ── 01: LINK CONSOLE ── */}
            <SentinelFade delay={0.08}>
              <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/30">
                    <span className="h-1 w-1 rounded-full bg-amber-400/50" />
                    01 · LINK CONSOLE · GitHub Integration
                  </div>
                  <div className="w-14" />
                </div>

                <div className="bg-black/15 p-5 sm:p-6">
                  {/* description */}
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-lg space-y-2 text-xs text-foreground/55">
                      <p>
                        <span className="font-semibold text-white/80">Option A — Manual:</span>{" "}
                        paste a PR URL and use{" "}
                        <code className="rounded bg-amber-400/10 px-1 py-0.5 font-mono text-amber-200/70">GITHUB_TOKEN</code>{" "}
                        on the API (repo read + pull request write).
                      </p>
                      <p>
                        <span className="font-semibold text-white/80">Option B — GitHub App:</span>{" "}
                        install the app, then claim the installation ID to enable webhooks on every PR.
                      </p>
                    </div>

                    {status.data?.installUrl ? (
                      <a
                        href={status.data.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-2 text-xs font-semibold text-amber-200/80 transition hover:bg-amber-400/[0.14] hover:text-amber-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Install GitHub App
                      </a>
                    ) : (
                      <span className="text-[10px] text-foreground/30">
                        Set GITHUB_APP_SLUG for one-click install
                      </span>
                    )}
                  </div>

                  {/* claim form */}
                  <div className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-amber-400/15 bg-amber-400/[0.03] px-4 py-3">
                    <div className="min-w-[160px] flex-1">
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Claim installation ID
                      </label>
                      <input
                        value={installationId}
                        onChange={(e) => setInstallationId(e.target.value)}
                        placeholder="e.g. 12345678"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white placeholder:text-foreground/25 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/15"
                      />
                    </div>
                    <button
                      type="button"
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
                          await queryClient.invalidateQueries({ queryKey: ["sentinel-installations"] });
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Claim failed");
                        } finally {
                          setClaiming(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-xs font-semibold text-amber-200/70 transition hover:bg-amber-400/[0.13] hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {claiming && <Loader2 className="h-3 w-3 animate-spin" />}
                      Link install
                    </button>
                  </div>

                  {/* installations list */}
                  {installations.data?.installations?.length ? (
                    <div className="space-y-2">
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/30">
                        Authorized Nodes
                      </p>
                      {installations.data.installations.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                          style={{ borderLeft: "2px solid rgba(251,191,36,0.25)" }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-white/90">
                              {inst.account_login || `Installation ${inst.installation_id}`}
                            </p>
                            <p className="font-mono text-[10px] text-foreground/35">
                              id {inst.installation_id}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void toggleAutoApprove(
                                inst.installation_id,
                                !inst.metadata?.autoApprove,
                              )
                            }
                            className="flex items-center gap-2 text-[10px] text-foreground/45 transition hover:text-foreground/70"
                          >
                            <Settings2 className="h-3 w-3" />
                            Auto-approve
                            <ToggleSwitch checked={Boolean(inst.metadata?.autoApprove)} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </SentinelFade>

            {/* ── 02: SCAN CONSOLE ── */}
            <SentinelFade delay={0.12}>
              <form onSubmit={onSubmit}>
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]">
                  <ScanningOverlay active={submitting} />

                  {/* window chrome */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/30">
                      <span className="h-1 w-1 rounded-full bg-amber-400/50" />
                      02 · SCAN CONSOLE · Pull Request Review
                    </div>
                    <div className="w-14" />
                  </div>

                  <div className="bg-black/15 p-5 sm:p-6">
                    <div className="space-y-4">

                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-black/25 p-1.5">
                        {([
                          { focus: "general" as const, label: "General review", Icon: ShieldCheck },
                          { focus: "security" as const, label: "Security review", Icon: LockKeyhole },
                        ]).map(({ focus, label, Icon }) => (
                          <button
                            key={focus}
                            type="button"
                            onClick={() => {
                              setReviewFocus(focus);
                              if (focus === "security") setAutoApprove(false);
                            }}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition",
                              reviewFocus === focus
                                ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-100"
                                : "border-transparent text-foreground/35 hover:text-foreground/60",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* PR URL input */}
                      <div>
                        <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                          PR URL
                        </label>
                        <div className="relative">
                          <GitPullRequest className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/40" />
                          <input
                            value={prUrl}
                            onChange={(e) => setPrUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo/pull/42"
                            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder:text-foreground/25 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/15"
                          />
                        </div>
                      </div>

                      {reviewFocus === "security" ? (
                        <div>
                          <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                            Security context <span className="normal-case tracking-normal text-foreground/22">(optional)</span>
                          </label>
                          <textarea
                            value={securityContext}
                            onChange={(e) => setSecurityContext(e.target.value)}
                            rows={3}
                            placeholder="Sensitive assets, trust boundaries, threat model, compliance requirements…"
                            className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-amber-400/15"
                          />
                          <p className="mt-1.5 text-[10px] text-amber-200/45">Security reviews never auto-approve and remain advisory until a human reviews the evidence.</p>
                        </div>
                      ) : null}

                      {/* toggle options */}
                      <div className="flex flex-wrap gap-2.5">
                        <ToggleOption
                          checked={postToGithub}
                          onChange={setPostToGithub}
                          label="Post to GitHub"
                          icon={<ExternalLink className="h-3 w-3" />}
                        />
                        {reviewFocus === "general" ? (
                          <ToggleOption
                            checked={autoApprove}
                            onChange={setAutoApprove}
                            label="Auto-approve if clean"
                            icon={<ShieldCheck className="h-3 w-3" />}
                          />
                        ) : null}
                      </div>

                      {/* messages */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-xs text-red-300/90"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                          >
                            {error}{" "}
                            {error.includes("Billing") && (
                              <Link href="/app/billing" className="font-semibold underline underline-offset-2">
                                Go to Billing
                              </Link>
                            )}
                          </motion.div>
                        )}
                        {message && (
                          <motion.div
                            className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-xs text-emerald-300/90"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                            {message}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* submit button with conic border */}
                      <div className="relative w-full rounded-xl p-[2px]">
                        {!submitting && (
                          <div
                            className="absolute -inset-[2px] rounded-xl opacity-50"
                            style={{
                              background:
                                "conic-gradient(from var(--sn-angle,0deg),#fbbf24,#f97316,#ef4444,#fbbf24)",
                              animation: "sn-conic-spin 3s linear infinite",
                            }}
                          />
                        )}
                        <Button
                          type="submit"
                          disabled={submitting || !prUrl.trim()}
                          size="lg"
                          className="relative z-10 w-full border border-transparent bg-[#0e0a03] py-6 text-base font-semibold text-amber-200/80 shadow-none transition hover:bg-[#160e04] hover:text-amber-100 disabled:opacity-40"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {reviewFocus === "security" ? "Threat modeling…" : "Reviewing…"}
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4" />
                              {reviewFocus === "security" ? "Run Security Review" : "Run Sentinel Review"}
                            </>
                          )}
                        </Button>
                      </div>

                    </div>
                  </div>
                </div>
              </form>
            </SentinelFade>

          </div>

          {/* RIGHT COLUMN: reviews sidebar */}
          <SentinelFade delay={0.14}>
            <div>
              {/* sidebar header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/30">
                  SYS:LOG · Reviews
                </span>
                {reviews.data?.reviews.length ? (
                  <span className="font-mono text-[9px] text-foreground/25">
                    {reviews.data.reviews.length.toString().padStart(2, "0")}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                {reviews.isLoading ? (
                  <div className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-8 text-center text-[11px] text-foreground/35">
                    Loading…
                  </div>
                ) : reviews.isError ? (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-6 text-center text-[11px] text-amber-300/80">
                    {reviews.error instanceof Error ? reviews.error.message : "Could not load"}
                  </div>
                ) : !reviews.data?.reviews.length ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                    <Shield className="mx-auto mb-2.5 h-6 w-6 text-foreground/20" />
                    <p className="text-[11px] text-foreground/35">No PR reviews yet.</p>
                    <p className="mt-1 text-[10px] text-foreground/20">Paste a PR URL and run a scan.</p>
                  </div>
                ) : (
                  reviews.data.reviews.map((r, i) => {
                    const pending = ["queued", "running"].includes(r.status);
                    const succeeded = r.status === "succeeded";
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <Link href={`/app/sentinel/${r.id}`} className="group block">
                          <div
                            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/15 p-3.5 transition duration-300 group-hover:border-amber-400/20 group-hover:bg-white/[0.04]"
                            style={{ borderLeft: "2px solid rgba(251,191,36,0.22)" }}
                          >
                            {/* scan beam on succeeded */}
                            {succeeded && (
                              <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-30"
                                style={{
                                  background: "linear-gradient(to right,transparent,#fbbf24,transparent)",
                                  animation: "sn-scan-beam 3s ease-in-out infinite",
                                }}
                              />
                            )}

                            {/* title */}
                            <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white">
                              {r.title || "PR review"}
                            </p>
                            {r.reviewFocus === "security" ? (
                              <span className="mt-1 inline-flex rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-300/70">Security</span>
                            ) : null}

                            {/* PR URL */}
                            <p className="mt-0.5 truncate font-mono text-[10px] text-foreground/35">
                              {r.prUrl ? r.prUrl.replace("https://github.com/", "") : "—"}
                            </p>

                            {/* footer */}
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-foreground/30">
                                {r.verdict ?? "—"}
                                {r.findingCount != null ? ` · ${r.findingCount} findings` : ""}
                              </span>
                              <span
                                className={cn(
                                  "flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                  succeeded && "bg-amber-400/15 text-amber-300",
                                  r.status === "failed" && "bg-red-400/15 text-red-300",
                                  pending && "animate-pulse bg-amber-400/10 text-amber-400/70",
                                )}
                              >
                                {r.status}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </SentinelFade>

        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── page export ─────────────────────────── */

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
