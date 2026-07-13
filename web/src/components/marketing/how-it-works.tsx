import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    title: "Connect once",
    body: "Sign in with Clerk. Optionally connect GitHub for Sentinel and Forge. Upload files to R2-backed storage.",
  },
  {
    step: "02",
    title: "Run a focused tool",
    body: "Pick Blueprint, Pulse, Atlas, Sentinel, Forge, or Radar. Each workflow is purpose-built — not a generic chat box.",
  },
  {
    step: "03",
    title: "Ship with confidence",
    body: "Get structured reviews, diagrams, PR comments, or RCA checklists you can act on immediately.",
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
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
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
