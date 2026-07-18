export type ProductStatus = "available" | "coming_soon";

export type ProductSlug =
  | "blueprint"
  | "pulse"
  | "atlas"
  | "orbit"
  | "sentinel"
  | "forge"
  | "aegis"
  | "echo"
  | "radar"
  | "relay"
  | "arena";

export interface Product {
  slug: ProductSlug;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  href: string;
  accent: string;
  icon: string;
  features: string[];
}

/** Live v1 products + future placeholders */
export const products: Product[] = [
  {
    slug: "blueprint",
    name: "Blueprint",
    tagline: "Architecture diagrams that get a real review",
    description:
      "Upload architecture diagrams and get structured feedback on scalability, reliability, bottlenecks, and design tradeoffs.",
    status: "available",
    href: "/app/blueprint",
    accent: "from-cyan-400 to-blue-500",
    icon: "Layers",
    features: [
      "Diagram upload (PNG, SVG, PDF, Mermaid)",
      "Scalability & reliability scoring",
      "Bottleneck & SPOF detection",
      "Exportable review reports",
    ],
  },
  {
    slug: "pulse",
    name: "Pulse",
    tagline: "Chat with your data, not your BI backlog",
    description:
      "Chat with spreadsheets and SQL databases to generate queries, dashboards, and business insights.",
    status: "available",
    href: "/app/pulse",
    accent: "from-emerald-400 to-teal-500",
    icon: "Activity",
    features: [
      "CSV / XLSX analysis",
      "Natural language → SQL",
      "Auto-generated charts",
      "Saved insight sessions",
    ],
  },
  {
    slug: "atlas",
    name: "Atlas",
    tagline: "Every repo, mapped and explained",
    description:
      "Paste any GitHub repository and get architecture diagrams, code explanations, and onboarding guides.",
    status: "available",
    href: "/app/atlas",
    accent: "from-violet-400 to-purple-500",
    icon: "Map",
    features: [
      "Public repo indexing",
      "Mermaid architecture maps",
      "Module & flow explanations",
      "Onboarding playbooks",
    ],
  },
  {
    slug: "sentinel",
    name: "Sentinel",
    tagline: "PR reviews that ship with the team",
    description:
      "Review pull requests, catch bugs, and suggest improvements — with comments and optional approval on GitHub itself.",
    status: "available",
    href: "/app/sentinel",
    accent: "from-amber-400 to-orange-500",
    icon: "Shield",
    features: [
      "GitHub App integration",
      "Inline PR comments",
      "Severity-aware reviews",
      "Optional auto-approve",
    ],
  },
  {
    slug: "forge",
    name: "Forge",
    tagline: "Issues in → PRs out",
    description:
      "Reads GitHub issues, creates an implementation plan, writes code, and opens a pull request.",
    status: "available",
    href: "/app/forge",
    accent: "from-rose-400 to-pink-500",
    icon: "Hammer",
    features: [
      "Issue → plan → code",
      "Human plan approval",
      "Branch + PR automation",
      "Scoped, safe changes",
    ],
  },
  {
    slug: "radar",
    name: "Radar",
    tagline: "Find the root cause before the war room ends",
    description:
      "Analyze logs, metrics, and traces to identify the root cause of production incidents.",
    status: "available",
    href: "/app/radar",
    accent: "from-red-400 to-rose-600",
    icon: "Radar",
    features: [
      "Log paste & upload",
      "Ranked root causes",
      "Investigation checklists",
      "Draft postmortem sections",
    ],
  },
  {
    slug: "relay",
    name: "Relay",
    tagline: "Make CI fast, stable, and measurable",
    description:
      "Analyze workflow runs, cache behavior, flaky tests, duplicated work, and critical paths to optimize delivery pipelines.",
    status: "available",
    href: "/app/relay",
    accent: "from-indigo-400 to-blue-600",
    icon: "Workflow",
    features: [
      "Critical-path analysis",
      "Cache miss detection",
      "Flaky test evidence",
      "Prioritized pipeline fixes",
    ],
  },
  {
    slug: "orbit",
    name: "Orbit",
    tagline: "Your career, navigated by AI",
    description:
      "Find jobs, tailor your resume, generate cover letters, and track applications.",
    status: "coming_soon",
    href: "/#waitlist",
    accent: "from-sky-400 to-indigo-500",
    icon: "Orbit",
    features: [
      "Job matching",
      "Resume tailoring",
      "Cover letter generation",
      "Application tracking",
    ],
  },
  {
    slug: "aegis",
    name: "Aegis",
    tagline: "Docs that answer before tickets pile up",
    description:
      "Answer customer questions using company documentation with RAG.",
    status: "coming_soon",
    href: "/#waitlist",
    accent: "from-lime-400 to-green-500",
    icon: "LifeBuoy",
    features: [
      "Doc ingestion",
      "RAG answers",
      "Source citations",
      "Support handoff",
    ],
  },
  {
    slug: "echo",
    name: "Echo",
    tagline: "Meetings that become action",
    description:
      "Summarize meetings, extract action items, and automatically create Jira tickets.",
    status: "coming_soon",
    href: "/#waitlist",
    accent: "from-fuchsia-400 to-purple-600",
    icon: "AudioLines",
    features: [
      "Meeting summaries",
      "Action item extraction",
      "Jira ticket creation",
      "Follow-up reminders",
    ],
  },
  {
    slug: "arena",
    name: "Arena",
    tagline: "Interview practice that feels real",
    description:
      "Practice technical and behavioural interviews with personalized AI feedback.",
    status: "coming_soon",
    href: "/#waitlist",
    accent: "from-yellow-400 to-amber-500",
    icon: "Mic",
    features: [
      "Technical interviews",
      "Behavioural coaching",
      "Personalized feedback",
      "Progress tracking",
    ],
  },
];

export const availableProducts = products.filter((p) => p.status === "available");
export const comingSoonProducts = products.filter(
  (p) => p.status === "coming_soon",
);

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
