import { AppSidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/header";
import { MeBootstrap } from "@/components/app/me-bootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <MeBootstrap />
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
