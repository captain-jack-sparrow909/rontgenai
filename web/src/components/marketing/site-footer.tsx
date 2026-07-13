import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#03050a]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-slate-950">
              R
            </span>
            <span className="text-sm font-semibold">
              Röntgen<span className="text-cyan-400">AI</span>
            </span>
          </div>
          <p className="text-sm text-foreground/55">
            See through your systems. AI tools for architecture, code, data, and
            production reliability.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-medium text-foreground/90">Product</p>
            <ul className="space-y-2 text-foreground/55">
              <li>
                <Link href="#products" className="hover:text-foreground">
                  Suite
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-foreground/90">Company</p>
            <ul className="space-y-2 text-foreground/55">
              <li>
                <a href="mailto:hello@rontgenai.dev" className="hover:text-foreground">
                  hello@rontgenai.dev
                </a>
              </li>
              <li>
                <a href="mailto:support@rontgenai.dev" className="hover:text-foreground">
                  support@rontgenai.dev
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-foreground/90">Legal</p>
            <ul className="space-y-2 text-foreground/55">
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-foreground/40">
        © {new Date().getFullYear()} Röntgen AI · rontgenai.dev
      </div>
    </footer>
  );
}
