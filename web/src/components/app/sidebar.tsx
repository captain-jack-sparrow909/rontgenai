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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/5 bg-[#070a12]">
      <div className="flex h-14 items-center gap-2 border-b border-white/5 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">
            R
          </span>
          <span className="text-sm font-semibold">
            Röntgen<span className="text-cyan-400">AI</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link
          href="/app"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
            pathname === "/app"
              ? "bg-white/10 text-white"
              : "text-foreground/60 hover:bg-white/5 hover:text-white",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>

        <p className="px-3 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wider text-foreground/35">
          Products
        </p>
        {availableProducts.map((p) => {
          const active = pathname.startsWith(p.href);
          return (
            <Link
              key={p.slug}
              href={p.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-foreground/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br text-slate-950",
                  p.accent,
                )}
              >
                <ProductIcon name={p.icon} className="h-3.5 w-3.5" />
              </span>
              {p.name}
            </Link>
          );
        })}

        <p className="px-3 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wider text-foreground/35">
          Account
        </p>
        {navExtra.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-foreground/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-foreground/40">
            Plan
          </p>
          <p className="text-sm font-medium capitalize text-white">{plan}</p>
          {plan === "free" ? (
            <Link
              href="/app/billing"
              className="text-xs text-cyan-400 hover:underline"
            >
              Upgrade
            </Link>
          ) : (
            <Link
              href="/app/billing"
              className="text-xs text-foreground/50 hover:underline"
            >
              Manage
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
