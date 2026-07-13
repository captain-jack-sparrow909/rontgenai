import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    title: "Start free",
    body: "Land on the product suite, create an account with Clerk, and try Blueprint, Pulse, Atlas, or Radar on the free tier.",
  },
  {
    step: "02",
    title: "Run a focused tool",
    body: "Each product is purpose-built — architecture reviews, spreadsheet chat, repo maps, PR reviews, issue→PR, or incident RCA.",
  },
  {
    step: "03",
    title: "Ship with confidence",
    body: "Export reports, open GitHub PRs, post review comments, and upgrade when you need higher limits or automation.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            How it works
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From signal to decision in minutes
          </h2>
          <p className="mt-3 text-sm text-foreground/50">
            One platform. Six specialist tools. Shared auth, billing, and usage.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              <span className="font-mono text-sm text-cyan-400/80">{s.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/55">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
