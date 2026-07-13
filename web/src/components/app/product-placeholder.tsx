import Link from "next/link";
import { ProductIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductPlaceholder({ product }: { product: Product }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-slate-950 shadow-lg",
            product.accent,
          )}
        >
          <ProductIcon name={product.icon} className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{product.name}</h1>
            <Badge variant="secondary">Phase 1+</Badge>
          </div>
          <p className="mt-1 text-sm text-cyan-300/70">{product.tagline}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming online soon</CardTitle>
          <CardDescription>{product.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {product.features.map((f) => (
              <li
                key={f}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-foreground/65"
              >
                {f}
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground/50">
            This product workspace is reserved for a future release. The six
            live tools (Blueprint, Pulse, Atlas, Sentinel, Forge, Radar) are
            available from the dashboard.
          </p>
          <Button asChild variant="secondary">
            <Link href="/app">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
