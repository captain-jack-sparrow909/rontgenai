"use client";

import Link from "next/link";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/5 bg-[#05070d]/70 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/30">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            Röntgen<span className="text-cyan-400">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
          <Link href="#products" className="transition hover:text-foreground">
            Products
          </Link>
          <Link href="#how-it-works" className="transition hover:text-foreground">
            How it works
          </Link>
          <Link href="#pricing" className="transition hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex md:hidden">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <AuthButtons size="sm" />
        </div>
      </div>
    </header>
  );
}
