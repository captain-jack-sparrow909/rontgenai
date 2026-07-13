import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-2 text-xs text-foreground/40">
          Last updated: 13 July 2026 · Draft for early access
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/70">
          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Agreement</h2>
            <p>
              By using Röntgen AI (rontgenai.dev) you agree to these terms.
              Contact:{" "}
              <a className="text-cyan-400" href="mailto:hello@rontgenai.dev">
                hello@rontgenai.dev
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">The service</h2>
            <p>
              We provide AI-assisted tools for architecture review, data
              analysis, repository understanding, code review, issue
              automation, and incident investigation. Features and limits depend
              on your plan.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Accounts</h2>
            <p>
              You must provide accurate information and keep credentials secure.
              You are responsible for activity under your account and any
              GitHub installations you authorize.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">
              Acceptable use
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>No illegal, harmful, or abusive use of the service.</li>
              <li>
                No attempts to bypass plan limits, rate limits, or security
                controls.
              </li>
              <li>
                GitHub automation (Sentinel, Forge) must respect repository
                permissions and your organization&apos;s policies.
              </li>
              <li>
                Do not submit secrets, credentials, or regulated data you are
                not allowed to process with third-party AI.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">AI outputs</h2>
            <p>
              Outputs may be incorrect or incomplete. You are solely responsible
              for reviewing AI suggestions before relying on them in production
              systems, code merges, or operational decisions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Billing</h2>
            <p>
              Paid plans are billed via Paddle (Merchant of Record). Fees are as
              shown at checkout. You may cancel according to Paddle/customer
              portal terms; unused periods are generally non-refundable unless
              required by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">
              Disclaimer &amp; liability
            </h2>
            <p>
              The service is provided &quot;as is&quot; without warranties to
              the fullest extent permitted by law. Our aggregate liability
              arising from the service is limited to the amounts you paid us in
              the three months preceding the claim (or zero if on a free plan).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Changes</h2>
            <p>
              We may modify the service or these terms. Continued use after
              changes constitutes acceptance of the updated terms.
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
