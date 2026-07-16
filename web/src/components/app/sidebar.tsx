"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Settings } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { useMe } from "@/hooks/use-me";
import { availableProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

/** Per-product RGB triplet for the active state accent */
const SLUG_RGB: Record<string, string> = {
  blueprint: "34,211,238",
  pulse:     "52,211,153",
  atlas:     "167,139,250",
  sentinel:  "251,191,36",
  forge:     "251,113,133",
  radar:     "248,113,113",
};

const navExtra = [
  { href: "/app/billing",  label: "Billing",  icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings   },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const plan = me?.subscription.plan ?? "free";

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#060810]/96 backdrop-blur-xl">
      {/* Ambient vertical glow along left edge */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent" />
      </div>

      {/* ── Logo ── */}
      <div className="flex h-14 items-center border-b border-white/[0.05] px-4">
        <Link href="/app" className="group flex items-center gap-2.5">
          <div className="relative">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/25 transition group-hover:shadow-cyan-500/45">
              R
            </span>
            {/* System online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
              <span className="relative flex h-2 w-2 rounded-full border border-[#060810] bg-emerald-400" />
            </span>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Röntgen<span className="text-cyan-400">AI</span>
          </span>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto p-2.5">

        {/* Dashboard */}
        <div className="mb-1">
          <SidebarLink
            href="/app"
            active={pathname === "/app"}
            icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          >
            Dashboard
          </SidebarLink>
        </div>

        {/* Products */}
        <SectionHeader>Products</SectionHeader>
        <div className="space-y-0.5">
          {availableProducts.map((p) => {
            const active = pathname.startsWith(p.href);
            const rgb = SLUG_RGB[p.slug] ?? "34,211,238";
            return (
              <Link
                key={p.slug}
                href={p.href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
                  active ? "text-white" : "text-foreground/48 hover:text-foreground/88",
                )}
                style={active ? {
                  background: `rgba(${rgb},0.07)`,
                  boxShadow:  `inset 0 0 0 1px rgba(${rgb},0.12)`,
                } : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                    style={{
                      background: `rgb(${rgb})`,
                      boxShadow:  `0 0 8px rgba(${rgb},0.9)`,
                    }}
                  />
                )}
                <span
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-slate-950 transition-all",
                    p.accent,
                    active ? "scale-105 shadow-md" : "opacity-80 group-hover:opacity-100",
                  )}
                >
                  <ProductIcon name={p.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{p.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Account */}
        <SectionHeader>Account</SectionHeader>
        <div className="space-y-0.5">
          {navExtra.map(({ href, label, icon: Icon }) => (
            <SidebarLink
              key={href}
              href={href}
              active={pathname.startsWith(href)}
              icon={<Icon className="h-3.5 w-3.5" />}
            >
              {label}
            </SidebarLink>
          ))}
        </div>

      </nav>

      {/* ── Plan card ── */}
      <div className="border-t border-white/[0.05] p-2.5">
        <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent px-3 py-2.5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35">Plan</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                plan === "free"
                  ? "bg-white/[0.07] text-foreground/45"
                  : "bg-cyan-400/15 text-cyan-300",
              )}
            >
              {plan}
            </span>
          </div>
          <Link
            href="/app/billing"
            className="mt-1.5 inline-block text-[11px] font-medium text-cyan-400/75 transition hover:text-cyan-300"
          >
            {plan === "free" ? "Upgrade for GitHub tools →" : "Manage billing →"}
          </Link>
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-4 flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/28">
        {children}
      </span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function SidebarLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
        active
          ? "bg-white/[0.06] text-white ring-1 ring-white/[0.08]"
          : "text-foreground/48 hover:bg-white/[0.03] hover:text-foreground/88",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_7px_rgba(34,211,238,0.8)]" />
      )}
      <span
        className={cn(
          "transition-colors",
          active ? "text-cyan-300/80" : "text-foreground/38 group-hover:text-foreground/65",
        )}
      >
        {icon}
      </span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
