"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { MobileNav } from "@/components/app/mobile-nav";
import { availableProducts } from "@/lib/products";

const SLUG_RGB: Record<string, string> = {
  blueprint: "34,211,238",
  pulse:     "52,211,153",
  atlas:     "167,139,250",
  sentinel:  "251,191,36",
  forge:     "251,113,133",
  radar:     "248,113,113",
};

export function AppHeader() {
  const pathname = usePathname();
  const currentProduct = availableProducts.find((p) => pathname.startsWith(p.href));
  const rgb = currentProduct ? (SLUG_RGB[currentProduct.slug] ?? "34,211,238") : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.05] bg-[#05070d]/88 px-3 backdrop-blur-xl sm:px-4">
      {/* Bottom gradient line — shifts to the active product colour */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-all duration-500"
        style={{
          background: rgb
            ? `linear-gradient(to right,transparent,rgba(${rgb},0.3),transparent)`
            : "linear-gradient(to right,transparent,rgba(34,211,238,0.12),transparent)",
        }}
      />

      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav />
        <Link href="/app" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">
            R
          </span>
          <span className="text-sm font-semibold">
            Röntgen<span className="text-cyan-400">AI</span>
          </span>
        </Link>
      </div>

      {/* Desktop: dynamic breadcrumb */}
      <div className="hidden items-center gap-2 md:flex">
        {currentProduct ? (
          <>
            <span className="text-[11px] text-foreground/28">Röntgen</span>
            <ChevronRight className="h-3 w-3 text-foreground/18" />
            <span
              className="flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: rgb ? `rgb(${rgb})` : "#22d3ee" }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-slate-950"
                style={{
                  background: rgb
                    ? `linear-gradient(to bottom right,rgba(${rgb},0.95),rgba(${rgb},0.55))`
                    : "linear-gradient(to bottom right,#22d3ee,#3b82f6)",
                }}
              >
                <ProductIcon name={currentProduct.icon} className="h-2.5 w-2.5" />
              </span>
              {currentProduct.name}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/28">
              Engineering Suite
            </span>
          </div>
        )}
      </div>

      <AuthButtons size="sm" />
    </header>
  );
}
