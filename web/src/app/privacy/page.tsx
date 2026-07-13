import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-2 text-xs text-foreground/40">
          Last updated: 13 July 2026 · Draft for early access
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/70">
          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Who we are</h2>
            <p>
              Röntgen AI (&quot;we&quot;, &quot;us&quot;) operates rontgenai.dev.
              Contact:{" "}
              <a className="text-cyan-400" href="mailto:support@rontgenai.dev">
                support@rontgenai.dev
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Data we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground/90">Account data</strong> —
                name, email, and auth identifiers via Clerk.
              </li>
              <li>
                <strong className="text-foreground/90">Usage data</strong> —
                product actions, plan limits, and billing status (Paddle).
              </li>
              <li>
                <strong className="text-foreground/90">Content you submit</strong>{" "}
                — diagrams, files, logs, repo URLs, and prompts needed to run
                products. Stored in object storage (Cloudflare R2) and/or our
                database (Supabase).
              </li>
              <li>
                <strong className="text-foreground/90">GitHub data</strong> —
                when you install Sentinel/Forge, repository metadata, diffs, and
                issues required to provide those features.
              </li>
              <li>
                <strong className="text-foreground/90">Analytics</strong> —
                product analytics (e.g. PostHog) and error monitoring (Sentry).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">How we use data</h2>
            <p>
              To provide and improve the service, enforce plan limits, process
              payments, send transactional email, prevent abuse, and comply with
              law. AI providers (e.g. DeepSeek) process prompts and relevant
              content to generate outputs; we do not sell your personal data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Retention</h2>
            <p>
              Account data is kept while your account is active. Free-tier
              history may be limited by plan. You may request deletion via{" "}
              <a className="text-cyan-400" href="mailto:support@rontgenai.dev">
                support@rontgenai.dev
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Your rights</h2>
            <p>
              Depending on your location, you may have rights to access,
              correct, export, or delete personal data. Contact support to
              exercise these rights.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Changes</h2>
            <p>
              We may update this policy; material changes will be reflected by
              the date above and, where appropriate, in-product notice.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm text-cyan-400">
          ← Back home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
