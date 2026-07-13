"use client";

import Link from "next/link";
import { ProductIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMe } from "@/hooks/use-me";
import { availableProducts, comingSoonProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: me, isLoading, isError, error } = useMe();

  const productLabels: Record<string, string> = {
    blueprint: "Blueprint",
    pulse: "Pulse",
    atlas: "Atlas",
    sentinel: "Sentinel",
    forge: "Forge",
    radar: "Radar",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/55">
          {me?.profile.fullName || me?.profile.email
            ? `Welcome${me.profile.fullName ? `, ${me.profile.fullName}` : ""}.`
            : "Welcome to Röntgen AI."}{" "}
          Pick a product to get started — Blueprint ships next as the first full
          workflow.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground/80">
            Live products
          </h2>
          <Badge variant="success">v1</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableProducts.map((p) => (
            <Link key={p.slug} href={p.href} className="group">
              <Card className="h-full transition hover:border-white/20 hover:bg-white/[0.05]">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-slate-950",
                        p.accent,
                      )}
                    >
                      <ProductIcon name={p.icon} className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </div>
                  <CardDescription>{p.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground/45">Open workspace →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground/80">Coming soon</h2>
          <Badge variant="muted">waitlist</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {comingSoonProducts.map((p) => (
            <Card key={p.slug} className="opacity-70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant="muted">Soon</Badge>
                </div>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Usage this month</CardTitle>
              <CardDescription>
                Plan:{" "}
                <span className="text-cyan-300/80">
                  {isLoading
                    ? "…"
                    : me?.subscription.plan?.toUpperCase() ?? "FREE"}
                </span>
                {isError ? (
                  <span className="mt-1 block text-amber-400/90">
                    {error instanceof Error
                      ? error.message
                      : "Could not load usage — is api-gateway running?"}
                  </span>
                ) : null}
              </CardDescription>
            </div>
            <Link
              href="/app/billing"
              className="text-xs text-cyan-400 hover:underline"
            >
              Manage plan
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.keys(productLabels).map((key) => {
              const row = me?.usage?.[key];
              const limit = row?.limit;
              const used = row?.used ?? 0;
              const limitLabel =
                limit === undefined
                  ? "—"
                  : limit < 0
                    ? "∞"
                    : limit === 0
                      ? "n/a"
                      : String(limit);
              return (
                <div
                  key={key}
                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-xs text-foreground/45">
                    {productLabels[key]}
                  </p>
                  <p className="text-sm font-medium text-white">
                    {isLoading ? "…" : `${used} / ${limitLabel}`}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
