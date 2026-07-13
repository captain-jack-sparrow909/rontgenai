"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Settings } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { useMe } from "@/hooks/use-me";
import { availableProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

const navExtra = [
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const plan = me?.subscription.plan ?? "free";

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-[#070a12]/95 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 border-b border-white/5 px-4">
        <Link href="/app" className="group flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition group-hover:shadow-cyan-500/40">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Röntgen<span className="text-cyan-400">AI</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <SidebarLink
          href="/app"
          active={pathname === "/app"}
          icon={<LayoutDashboard className="h-4 w-4" />}
        >
          Dashboard
        </SidebarLink>

        <p className="px-3 pb-1.5 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground/30">
          Products
        </p>
        {availableProducts.map((p) => {
          const active = pathname.startsWith(p.href);
          return (
            <Link
              key={p.slug}
              href={p.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-white/[0.08] text-white shadow-inner"
                  : "text-foreground/55 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              ) : null}
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-slate-950 transition",
                  p.accent,
                  active ? "scale-105 shadow-md" : "opacity-90",
                )}
              >
                <ProductIcon name={p.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium">{p.name}</span>
            </Link>
          );
        })}

        <p className="px-3 pb-1.5 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground/30">
          Account
        </p>
        {navExtra.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <SidebarLink
              key={item.href}
              href={item.href}
              active={active}
              icon={<Icon className="h-4 w-4" />}
            >
              {item.label}
            </SidebarLink>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.05] to-transparent px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-foreground/40">
              Plan
            </p>
            <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium capitalize text-cyan-300">
              {plan}
            </span>
          </div>
          <Link
            href="/app/billing"
            className="mt-2 inline-block text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            {plan === "free" ? "Upgrade for GitHub tools →" : "Manage billing →"}
          </Link>
        </div>
      </div>
    </aside>
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
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-white/[0.08] text-white"
          : "text-foreground/55 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400" />
      ) : null}
      {icon}
      {children}
    </Link>
  );
}
