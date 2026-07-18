"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Compass,
  ExternalLink,
  GitPullRequest,
  Hammer,
  Loader2,
  MessageSquare,
  Search,
  Zap,
} from "lucide-react";
import {
  ForgeAtmosphere,
  ForgeFade,
} from "@/components/forge/shell";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createForgeJob,
  discoverForgeIssues,
  getForgeStatus,
  listForgeJobs,
  type ForgeIssueCandidate,
} from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

/* ─────────────────────────── static data ─────────────────────────── */

const TELEMETRY = [
  { label: "ENGINE", value: "DeepSeek v3" },
  { label: "INTEGRATION", value: "GitHub API" },
  { label: "OUTPUT", value: "Pull Request" },
  { label: "SCOPE", value: "Full Repo" },
] as const;

const CAPABILITIES = [
  "Plan Drafting",
  "Repo Analysis",
  "Human Approval",
  "Code Implementation",
  "Branch Management",
  "PR Creation",
  "Issue Context",
  "GitHub Integration",
] as const;

const PIPELINE = [
  {
    n: "01",
    Icon: CircleDot,
    label: "Plan",
    desc: "Read issue + repo context, draft scope & affected files",
  },
  {
    n: "02",
    Icon: CheckCircle2,
    label: "Approve",
    desc: "You review scope & files before any code is touched",
  },
  {
    n: "03",
    Icon: GitPullRequest,
    label: "PR",
    desc: "Branch + commits + pull request opened automatically",
  },
] as const;

/* ─────────────────────────── decorative ─────────────────────────── */

function HeatGrid() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "repeating-linear-gradient(0deg,rgba(251,113,133,0.016) 0px,rgba(251,113,133,0.016) 1px,transparent 1px,transparent 22px)",
          "repeating-linear-gradient(72deg,rgba(251,113,133,0.013) 0px,rgba(251,113,133,0.013) 1px,transparent 1px,transparent 40px)",
        ].join(","),
      }}
    />
  );
}

function HeatAmbience() {
  return (
    <>
      <div
        className="pointer-events-none fixed left-[5%] top-[15%] -z-10 h-[460px] w-[460px] rounded-full opacity-[0.032] blur-[110px]"
        style={{ background: "radial-gradient(circle,#fb7185,transparent 70%)" }}
      />
      <div
        className="pointer-events-none fixed bottom-[10%] right-[4%] -z-10 h-[360px] w-[360px] rounded-full opacity-[0.026] blur-[90px]"
        style={{ background: "radial-gradient(circle,#e879f9,transparent 70%)" }}
      />
    </>
  );
}

/** Rising heat arcs SVG — hero top-right decoration */
function ForgeDecoration() {
  return (
    <div className="pointer-events-none absolute -right-6 -top-4 h-64 w-72 overflow-hidden opacity-[0.065]">
      <svg viewBox="0 0 280 240" fill="none" className="h-full w-full">
        {/* Rising heat arcs from bottom center */}
        <path d="M 140 240 Q 75 185 55 100" stroke="#fb7185" strokeWidth="0.8" />
        <path d="M 140 240 Q 95 160 88 60" stroke="#fb7185" strokeWidth="0.8" strokeDasharray="5 7" />
        <path d="M 140 240 Q 185 160 192 60" stroke="#fb7185" strokeWidth="0.8" strokeDasharray="5 7" />
        <path d="M 140 240 Q 205 185 225 100" stroke="#fb7185" strokeWidth="0.8" />
        {/* Concentric ellipses (heat waves) */}
        <ellipse cx="140" cy="140" rx="58" ry="28" stroke="#fb7185" strokeWidth="0.6" />
        <ellipse cx="140" cy="100" rx="90" ry="44" stroke="#fb7185" strokeWidth="0.5" strokeDasharray="4 8" />
        <ellipse cx="140" cy="65" rx="118" ry="58" stroke="#fb7185" strokeWidth="0.4" />
        {/* Node dots at intersections */}
        {[[140,140],[78,128],[202,128],[88,82],[192,82],[140,100]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#fb7185" opacity="0.75" />
        ))}
        {/* Horizontal reference lines */}
        <line x1="20" y1="100" x2="260" y2="100" stroke="#fb7185" strokeWidth="0.4" strokeDasharray="6 8" />
        <line x1="20" y1="128" x2="260" y2="128" stroke="#fb7185" strokeWidth="0.35" strokeDasharray="6 8" />
        {/* Animated scan beam */}
        <line
          x1="20" y1="114" x2="260" y2="114"
          stroke="#fb7185" strokeWidth="0.75" strokeOpacity="0.55"
          style={{ animation: "fg-scan-beam 2.8s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

/** Overlay shown while submitting (planning phase) */
function ForgingOverlay({ active }: { active: boolean }) {
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
          {/* Hammer + pulsing rings */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-rose-400/30"
                initial={{ width: 48, height: 48, opacity: 0.6 }}
                animate={{ width: 48 + i * 24, height: 48 + i * 24, opacity: 0 }}
                transition={{ duration: 1.8, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
            <motion.div
              animate={{ rotate: [0, -18, 0, -18, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/40 bg-rose-400/[0.09]"
            >
              <Hammer className="h-6 w-6 text-rose-300" />
            </motion.div>
          </div>
          {/* Fake plan lines appearing */}
          <div className="flex w-56 flex-col gap-1.5 opacity-55">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full bg-rose-400/20"
                style={{ width: `${50 + i * 9}%` }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.08 + i * 0.14, duration: 0.38 }}
              />
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300/70">
            Drafting plan…
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export default function ForgePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [issueUrl, setIssueUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLanguage, setDiscoverLanguage] = useState("");
  const [discoverOrganization, setDiscoverOrganization] = useState("");
  const [beginnerFriendly, setBeginnerFriendly] = useState(true);
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ForgeIssueCandidate[]>([]);

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
        const res = await createForgeJob(token, { issueUrl: issueUrl.trim() });
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

  const onDiscover = useCallback(async () => {
    setDiscoveryError(null);
    setDiscovering(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      const result = await discoverForgeIssues(token, {
        query: discoverQuery.trim() || undefined,
        language: discoverLanguage.trim() || undefined,
        organization: discoverOrganization.trim() || undefined,
        beginnerFriendly,
        unassignedOnly,
        limit: 12,
      });
      setCandidates(result.issues);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setDiscoveryError("Issue discovery requires Pro or Team. Upgrade on Billing.");
      } else {
        setDiscoveryError(err instanceof Error ? err.message : "Could not discover issues");
      }
    } finally {
      setDiscovering(false);
    }
  }, [beginnerFriendly, discoverLanguage, discoverOrganization, discoverQuery, getToken, unassignedOnly]);

  const selectCandidate = useCallback((candidate: ForgeIssueCandidate) => {
    setIssueUrl(candidate.url);
    setError(null);
    document.getElementById("forge-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <>
      <style>{`
        @property --fg-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes fg-conic-spin { to { --fg-angle: 360deg; } }
        @keyframes fg-border-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,113,133,0); }
          50%       { box-shadow: 0 0 22px 2px rgba(251,113,133,0.055); }
        }
        @keyframes fg-scan-beam {
          0%        { transform: translateY(-40px); opacity: 0; }
          15%, 85%  { opacity: 1; }
          100%      { transform: translateY(40px); opacity: 0; }
        }
      `}</style>

      <HeatGrid />
      <HeatAmbience />
      <ForgeAtmosphere />

      <div className="relative mx-auto max-w-5xl">

        {/* ── HERO ── */}
        <ForgeFade>
          <div
            className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]"
            style={{ animation: "fg-border-breathe 5s ease-in-out infinite" }}
          >
            <ForgeDecoration />

            {/* top shelf */}
            <div
              className="absolute inset-x-0 top-0 h-px opacity-50"
              style={{ background: "linear-gradient(to right,transparent,rgba(251,113,133,0.5),transparent)" }}
            />
            {/* bottom heat glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-32 opacity-[0.04]"
              style={{ background: "linear-gradient(to top,rgba(251,113,133,1),transparent)" }}
            />

            <div className="relative z-10 px-6 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {/* badge */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/[0.08] px-3 py-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                      Issue smithy
                    </span>
                  </div>

                  {/* title row */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl bg-rose-400/30 blur-xl" />
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 via-rose-400 to-pink-600 shadow-lg shadow-rose-500/30">
                        <Hammer className="h-7 w-7 text-slate-950" />
                      </span>
                    </div>
                    <div>
                      <h1
                        className="bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
                        style={{ backgroundImage: "linear-gradient(to right,#fda4af,#fb7185,#e879f9)" }}
                      >
                        Forge
                      </h1>
                      <p className="mt-1 text-sm text-foreground/45">
                        Issues in → plan approve → PR out
                      </p>
                    </div>
                  </div>
                </div>

                {/* quota card */}
                <div className="min-w-[190px] rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3 backdrop-blur-sm">
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
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(to right,#fb7185,#e879f9)" }}
                      initial={{ width: 0 }}
                      animate={{ width: usage?.limit === 0 ? "0%" : `${usagePct}%` }}
                      transition={{ duration: 0.9 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-foreground/35">plan + implement / month</p>

                  {status.data && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[
                        { label: "Token", ok: status.data.githubTokenConfigured },
                        { label: status.data.plan ?? "Plan", ok: status.data.planAllows },
                      ].map((s) => (
                        <span
                          key={s.label}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            s.ok ? "bg-rose-400/15 text-rose-300" : "bg-white/8 text-foreground/30",
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
                    <span className="font-mono text-[10px] text-rose-300/70">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ForgeFade>

        {/* ── CAPABILITY STRIP ── */}
        <ForgeFade delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            {CAPABILITIES.map((cap, i) => (
              <span key={cap} className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/35">
                {i > 0 && <span className="h-px w-3 bg-rose-400/20" />}
                {cap}
              </span>
            ))}
          </div>
        </ForgeFade>

        <ForgeFade delay={0.07}>
          <div className="mb-6 overflow-hidden rounded-2xl border border-rose-400/10 bg-black/15">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
                  <Compass className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white/85">Open-source issue finder</h2>
                  <p className="mt-0.5 text-[10px] text-foreground/35">Find active, unassigned GitHub issues and hand one directly to Forge.</p>
                </div>
              </div>
              <span className="rounded-full border border-rose-400/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-300/60">Pro · Team</span>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-400/40" />
                  <input value={discoverQuery} onChange={(e) => setDiscoverQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void onDiscover(); }} placeholder="What do you want to work on?" className="w-full rounded-lg border border-white/[0.07] bg-black/30 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-foreground/22 focus:border-rose-400/35 focus:outline-none" />
                </div>
                <input value={discoverLanguage} onChange={(e) => setDiscoverLanguage(e.target.value)} placeholder="Language" className="rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2.5 text-xs text-white placeholder:text-foreground/22 focus:border-rose-400/35 focus:outline-none" />
                <input value={discoverOrganization} onChange={(e) => setDiscoverOrganization(e.target.value)} placeholder="Organization" className="rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2.5 text-xs text-white placeholder:text-foreground/22 focus:border-rose-400/35 focus:outline-none" />
                <Button type="button" onClick={() => void onDiscover()} disabled={discovering} className="bg-rose-400/15 text-rose-200 hover:bg-rose-400/25">
                  {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Discover
                </Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[10px] text-foreground/45"><input type="checkbox" checked={beginnerFriendly} onChange={(e) => setBeginnerFriendly(e.target.checked)} className="accent-rose-400" /> Good first issues</label>
                <label className="flex cursor-pointer items-center gap-2 text-[10px] text-foreground/45"><input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} className="accent-rose-400" /> Unassigned only</label>
              </div>

              {discoveryError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
                  {discoveryError} {discoveryError.includes("Billing") ? <Link href="/app/billing" className="font-semibold underline">Open Billing</Link> : null}
                </div>
              ) : null}

              {candidates.length ? (
                <div className="grid gap-2 lg:grid-cols-2">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-rose-400/18">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[9px] text-rose-300/55">{candidate.repository}#{candidate.number}</p>
                          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/80">{candidate.title}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-400/10 px-2 py-1 font-mono text-[9px] font-bold text-rose-300">{candidate.score}</span>
                      </div>
                      {candidate.bodyPreview ? <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-foreground/38">{candidate.bodyPreview}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.labels.slice(0, 3).map((label) => <span key={label} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-foreground/40">{label}</span>)}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1 text-[9px] text-foreground/28"><MessageSquare className="h-3 w-3" /> {candidate.comments} · {candidate.reasons[0] ?? "Open issue"}</span>
                        <div className="flex gap-1">
                          <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-foreground/40"><a href={candidate.url} target="_blank" rel="noreferrer" aria-label="Open issue"><ExternalLink className="h-3 w-3" /></a></Button>
                          <Button type="button" size="sm" onClick={() => selectCandidate(candidate)} className="h-7 bg-rose-400/12 px-2.5 text-[10px] text-rose-200 hover:bg-rose-400/22">Use in Forge <ChevronRight className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </ForgeFade>

        {/* ── MAIN GRID ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_296px]">

          {/* COMPOSER */}
          <ForgeFade delay={0.08}>
            <form id="forge-composer" onSubmit={onSubmit}>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]">
                <ForgingOverlay active={submitting} />

                {/* window chrome */}
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/30">
                    <span className="h-1 w-1 rounded-full bg-rose-400/50" />
                    FORGE CONSOLE · Solve an Issue
                  </div>
                  <div className="w-14" />
                </div>

                <div className="bg-black/15 p-5 sm:p-6">
                  <div className="space-y-5">

                    {/* Issue URL input */}
                    <div>
                      <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">
                        Issue URL
                      </label>
                      <div className="relative">
                        <CircleDot className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400/40" />
                        <input
                          value={issueUrl}
                          onChange={(e) => setIssueUrl(e.target.value)}
                          placeholder="https://github.com/owner/repo/issues/42"
                          className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder:text-foreground/25 focus:border-rose-400/40 focus:outline-none focus:ring-2 focus:ring-rose-400/15"
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-foreground/28">
                        Token: {status.data?.githubTokenConfigured ? "configured" : "not set"} ·{" "}
                        Plan: {status.data?.plan ?? "…"}
                        {status.data && !status.data.planAllows ? " (upgrade required)" : ""}
                      </p>
                    </div>

                    {/* Pipeline visualization */}
                    <div>
                      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/28">
                        Pipeline
                      </p>
                      <div className="flex items-stretch gap-2">
                        {PIPELINE.map((step, i) => (
                          <div key={step.n} className="flex flex-1 items-stretch gap-2">
                            <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[8px] text-rose-400/55">{step.n}</span>
                                <step.Icon className="h-3 w-3 flex-shrink-0 text-rose-400/70" />
                              </div>
                              <p className="text-[11px] font-semibold text-rose-300/80">{step.label}</p>
                              <p className="text-[10px] leading-[1.45] text-foreground/38">{step.desc}</p>
                            </div>
                            {i < PIPELINE.length - 1 && (
                              <div className="flex items-center text-foreground/18">
                                <ChevronRight className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Error */}
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
                    </AnimatePresence>

                    {/* Footer: hint + submit */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] text-foreground/25">
                        Needs GITHUB_TOKEN with contents + pull-requests write
                      </p>

                      {/* dark-glass submit + conic border */}
                      <div className="relative rounded-xl p-[2px]">
                        {!submitting && (
                          <div
                            className="absolute -inset-[2px] rounded-xl opacity-50"
                            style={{
                              background:
                                "conic-gradient(from var(--fg-angle,0deg),#fb7185,#e879f9,#a855f7,#fb7185)",
                              animation: "fg-conic-spin 3s linear infinite",
                            }}
                          />
                        )}
                        <Button
                          type="submit"
                          disabled={submitting || !issueUrl.trim()}
                          size="lg"
                          className="relative z-10 border border-transparent bg-[#0f0709] px-8 py-6 text-base font-semibold text-rose-200/80 shadow-none transition hover:bg-[#180a0d] hover:text-rose-100 disabled:opacity-40"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Planning…
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4" />
                              Draft plan
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </form>
          </ForgeFade>

          {/* JOBS SIDEBAR */}
          <ForgeFade delay={0.12}>
            <div>
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-foreground/30">
                  SYS:LOG · Jobs
                </span>
                {jobs.data?.jobs.length ? (
                  <span className="font-mono text-[9px] text-foreground/25">
                    {jobs.data.jobs.length.toString().padStart(2, "0")}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                {jobs.isLoading ? (
                  <div className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-8 text-center text-[11px] text-foreground/35">
                    Loading…
                  </div>
                ) : jobs.isError ? (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-4 py-6 text-center text-[11px] text-rose-300/80">
                    {jobs.error instanceof Error ? jobs.error.message : "Could not load"}
                  </div>
                ) : !jobs.data?.jobs.length ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                    <Hammer className="mx-auto mb-2.5 h-6 w-6 text-foreground/20" />
                    <p className="text-[11px] text-foreground/35">No forge jobs yet.</p>
                    <p className="mt-1 text-[10px] text-foreground/20">Paste an issue URL to get started.</p>
                  </div>
                ) : (
                  jobs.data.jobs.map((j, i) => {
                    const done = j.stage === "done";
                    const active = ["planning", "implementing"].includes(j.stage);
                    return (
                      <motion.div
                        key={j.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <Link href={`/app/forge/${j.id}`} className="group block">
                          <div
                            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black/15 p-3.5 transition duration-300 group-hover:border-rose-400/20 group-hover:bg-white/[0.04]"
                            style={{ borderLeft: "2px solid rgba(251,113,133,0.22)" }}
                          >
                            {/* scan beam on done jobs */}
                            {done && (
                              <div
                                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-[0.28]"
                                style={{
                                  background: "linear-gradient(to right,transparent,#fb7185,transparent)",
                                  animation: "fg-scan-beam 3.2s ease-in-out infinite",
                                }}
                              />
                            )}

                            <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white">
                              {j.title || "Issue job"}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-foreground/35">
                              {j.issueUrl
                                ? j.issueUrl.replace("https://github.com/", "")
                                : "—"}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-foreground/30">
                                {j.prUrl ? `PR #${j.prNumber}` : j.stage}
                              </span>
                              <span
                                className={cn(
                                  "flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                  done && "bg-emerald-400/15 text-emerald-300",
                                  j.stage === "awaiting_approval" && "bg-amber-400/15 text-amber-300",
                                  j.stage === "rejected" && "bg-white/8 text-foreground/40",
                                  j.status === "failed" && "bg-red-400/15 text-red-300",
                                  active && "animate-pulse bg-rose-400/15 text-rose-300",
                                )}
                              >
                                {j.stage}
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
          </ForgeFade>

        </div>
      </div>
    </>
  );
}
