"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            One suite. Clear limits.
          </h2>
          <p className="mt-4 text-foreground/60">
            Start free. Upgrade when you need GitHub bots, higher quotas, or a
            team workspace. Annual billing saves ~2 months.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col",
                plan.highlighted &&
                  "border-cyan-400/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-cyan-500/10",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.highlighted && <Badge>Popular</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-semibold text-white">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-foreground/50">/mo</span>
                  {plan.priceYearly > 0 && (
                    <p className="mt-1 text-xs text-foreground/45">
                      or ${plan.priceYearly}/yr billed annually
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-foreground/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-foreground/50">
                  <p className="mb-1.5 font-medium text-foreground/70">Limits</p>
                  <ul className="space-y-1">
                    <li>Blueprint: {plan.limits.blueprint}</li>
                    <li>Pulse: {plan.limits.pulse}</li>
                    <li>Atlas: {plan.limits.atlas}</li>
                    <li>Sentinel: {plan.limits.sentinel}</li>
                    <li>Forge: {plan.limits.forge}</li>
                    <li>Radar: {plan.limits.radar}</li>
                    <li>{plan.limits.seats}</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                >
                  <Link href={plan.id === "free" ? "/sign-up" : "/app/billing"}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
