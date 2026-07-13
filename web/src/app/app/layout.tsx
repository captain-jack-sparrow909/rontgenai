import Link from "next/link";
import { AppSidebar } from "@/components/app/sidebar";
import { MeBootstrap } from "@/components/app/me-bootstrap";
import { MobileNav } from "@/components/app/mobile-nav";
import { AuthButtons } from "@/components/auth/auth-buttons";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <MeBootstrap />
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-[#05070d]/80 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav />
            <Link href="/app" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">
                R
              </span>
              <span className="text-sm font-semibold">
                Röntgen<span className="text-cyan-400">AI</span>
              </span>
            </Link>
          </div>
          <div className="hidden text-xs text-foreground/35 md:block">
            Engineering suite
          </div>
          <AuthButtons size="sm" />
        </header>
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
