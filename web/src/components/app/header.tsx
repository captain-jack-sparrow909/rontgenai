"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard } from "lucide-react";
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
  relay:     "129,140,248",
};

export function AppHeader() {
  const pathname = usePathname();
  const currentProduct = availableProducts.find((p) => pathname.startsWith(p.href));
  const rgb = currentProduct ? (SLUG_RGB[currentProduct.slug] ?? "34,211,238") : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.05] bg-[#05070d]/88 px-3 backdrop-blur-xl sm:px-4">
      {/* Bottom gradient line — product colour or default cyan */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-all duration-500"
        style={{
          background: rgb
            ? `linear-gradient(to right,transparent,rgba(${rgb},0.3),transparent)`
            : "linear-gradient(to right,transparent,rgba(34,211,238,0.12),transparent)",
        }}
      />

      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <MobileNav />
        <Link href="/app" className="flex items-center gap-2">
          <HeaderLogoMark />
          <span
            style={{
              fontFamily: "var(--font-rajdhani),sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              color: "#EDF2F7",
              letterSpacing: "0.08em",
            }}
          >
            RÖNTGEN
            <span style={{ color: "rgba(0,229,255,0.7)", fontWeight: 400 }}> AI</span>
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
              style={{ color: `rgb(${rgb})` }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-slate-950"
                style={{
                  background: `linear-gradient(to bottom right,rgba(${rgb},0.95),rgba(${rgb},0.55))`,
                }}
              >
                <ProductIcon name={currentProduct.icon} className="h-2.5 w-2.5" />
              </span>
              {currentProduct.name}
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-foreground/28">Röntgen</span>
            <ChevronRight className="h-3 w-3 text-foreground/18" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/55">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </span>
          </>
        )}
      </div>

      <AuthButtons size="sm" />
    </header>
  );
}

function HeaderLogoMark() {
  return (
    <div className="relative h-5 w-5 flex-shrink-0">
      <div
        className="absolute inset-0 rounded-md"
        style={{
          background: "linear-gradient(135deg,rgba(0,229,255,0.18),rgba(0,229,255,0.03))",
          border: "1px solid rgba(0,229,255,0.28)",
        }}
      />
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" fill="none">
        <circle cx="12" cy="12" r="4" stroke="#00E5FF" strokeWidth="1.4" />
        <line x1="12" y1="2" x2="12" y2="7" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="12" y1="17" x2="12" y2="22" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="2" y1="12" x2="7" y2="12" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="17" y1="12" x2="22" y2="12" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
        <circle cx="12" cy="12" r="1.5" fill="#00E5FF" />
      </svg>
    </div>
  );
}
