"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LayoutDashboard, Menu, Settings, X } from "lucide-react";
import { ProductIcon } from "@/components/icons";
import { useMe } from "@/hooks/use-me";
import { availableProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: me } = useMe();
  const plan = me?.subscription.plan ?? "free";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu backdrop"
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-white/10 bg-[#070a12] shadow-2xl md:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
            >
              <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
                <Link href="/app" className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">
                    R
                  </span>
                  <span className="text-sm font-semibold">
                    Röntgen<span className="text-cyan-400">AI</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-foreground/60 hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                <NavLink
                  href="/app"
                  active={pathname === "/app"}
                  icon={<LayoutDashboard className="h-4 w-4" />}
                >
                  Dashboard
                </NavLink>
                <p className="px-3 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wider text-foreground/35">
                  Products
                </p>
                {availableProducts.map((p) => (
                  <Link
                    key={p.slug}
                    href={p.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
                      pathname.startsWith(p.href)
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
                ))}
                <p className="px-3 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wider text-foreground/35">
                  Account
                </p>
                <NavLink
                  href="/app/billing"
                  active={pathname.startsWith("/app/billing")}
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  Billing
                </NavLink>
                <NavLink
                  href="/app/settings"
                  active={pathname.startsWith("/app/settings")}
                  icon={<Settings className="h-4 w-4" />}
                >
                  Settings
                </NavLink>
              </nav>

              <div className="border-t border-white/5 p-3">
                <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/40">
                    Plan
                  </p>
                  <p className="text-sm font-medium capitalize text-white">
                    {plan}
                  </p>
                  <Link
                    href="/app/billing"
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    {plan === "free" ? "Upgrade" : "Manage"}
                  </Link>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function NavLink({
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
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
        active
          ? "bg-white/10 text-white"
          : "text-foreground/60 hover:bg-white/5 hover:text-white",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
