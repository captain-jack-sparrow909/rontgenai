"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";

export default function SettingsPage() {
  const { data: me, isLoading, isError, error } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-foreground/55">
          Profile is managed by Clerk. Plan and usage sync from the API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Use the user menu (top right) for name, email, and security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading ? (
            <p className="text-foreground/50">Loading…</p>
          ) : isError ? (
            <p className="text-amber-400/90">
              {error instanceof Error
                ? error.message
                : "Could not load profile from API"}
            </p>
          ) : (
            <>
              <div className="flex justify-between gap-4 border-b border-white/5 py-2">
                <span className="text-foreground/50">Name</span>
                <span className="text-white">
                  {me?.profile.fullName || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/5 py-2">
                <span className="text-foreground/50">Email</span>
                <span className="text-white">{me?.profile.email || "—"}</span>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-foreground/50">Profile ID</span>
                <span className="font-mono text-xs text-foreground/70">
                  {me?.profile.id || "—"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plan</CardTitle>
            <Badge className="capitalize">
              {me?.subscription.plan ?? "free"}
            </Badge>
          </div>
          <CardDescription>
            Status: {me?.subscription.status ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/billing">Manage billing</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            GitHub App install for Sentinel &amp; Forge will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-foreground/45">
            No integrations connected yet
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization (Team)</CardTitle>
          <CardDescription>
            Free/Pro are personal. Team plan creates a Clerk Organization for
            shared seats, usage, and GitHub installs.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
