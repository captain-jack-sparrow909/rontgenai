"use client";

import Link from "next/link";
import { ExternalLink, GitBranch, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";

export default function SettingsPage() {
  const { data: me, isLoading, isError, error } = useMe();

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-foreground/50">
          Profile via Clerk. Plan and usage from the API.
        </p>
      </div>

      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Profile</h2>
            <p className="mt-0.5 text-xs text-foreground/40">
              Use the avatar menu for name, email, and security.
            </p>
          </div>
          <div className="space-y-0 px-5 py-2 text-sm">
            {isLoading ? (
              <p className="py-4 text-foreground/45">Loading…</p>
            ) : isError ? (
              <p className="py-4 text-amber-400/90">
                {error instanceof Error
                  ? error.message
                  : "Could not load profile from API"}
              </p>
            ) : (
              <>
                <Row label="Name" value={me?.profile.fullName || "—"} />
                <Row label="Email" value={me?.profile.email || "—"} />
                <Row
                  label="Profile ID"
                  value={me?.profile.id || "—"}
                  mono
                />
              </>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Plan</h2>
              <p className="mt-0.5 text-xs text-foreground/40">
                Status: {me?.subscription.status ?? "—"}
              </p>
            </div>
            <Badge className="capitalize">
              {me?.subscription.plan ?? "free"}
            </Badge>
          </div>
          <div className="px-5 py-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/billing">Manage billing</Link>
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Integrations</h2>
            <p className="mt-0.5 text-xs text-foreground/40">
              GitHub powers Sentinel PR reviews and Forge issue→PR.
            </p>
          </div>
          <div className="space-y-3 px-5 py-4">
            <Link
              href="/app/sentinel"
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 transition hover:border-amber-400/25"
            >
              <Shield className="h-5 w-5 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Sentinel</p>
                <p className="text-xs text-foreground/45">
                  Connect GitHub App or token for PR reviews
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-foreground/30" />
            </Link>
            <Link
              href="/app/forge"
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 transition hover:border-rose-400/25"
            >
              <GitBranch className="h-5 w-5 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Forge</p>
                <p className="text-xs text-foreground/45">
                  Issue → plan → PR with the same GitHub credentials
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-foreground/30" />
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">
              Organization (Team)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/50">
              Free and Pro are personal accounts. Team plan unlocks Clerk
              Organizations for shared seats, usage, and GitHub installs.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <span className="text-foreground/45">{label}</span>
      <span
        className={
          mono
            ? "max-w-[60%] truncate font-mono text-xs text-foreground/70"
            : "text-white"
        }
      >
        {value}
      </span>
    </div>
  );
}
