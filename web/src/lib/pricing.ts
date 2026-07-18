export type PlanId = "free" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  highlighted?: boolean;
  cta: string;
  features: string[];
  limits: {
    blueprint: string;
    pulse: string;
    atlas: string;
    sentinel: string;
    forge: string;
    radar: string;
    relay: string;
    seats: string;
  };
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Explore the suite and ship your first reviews.",
    cta: "Start free",
    features: [
      "Blueprint, Pulse, Atlas & Radar samples",
      "7-day history",
      "Community support",
    ],
    limits: {
      blueprint: "3 reviews / mo",
      pulse: "20 messages, 2 files",
      atlas: "2 public repos",
      sentinel: "—",
      forge: "—",
      radar: "2 investigations / mo",
      relay: "1 pipeline analysis / mo",
      seats: "1 seat",
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    priceYearly: 290,
    description: "For individual engineers who ship every week.",
    highlighted: true,
    cta: "Upgrade to Pro",
    features: [
      "Full access to all 7 live products",
      "Sentinel on 1 repo",
      "Forge issue → PR",
      "Unlimited history & exports",
      "Email support",
    ],
    limits: {
      blueprint: "50 reviews / mo",
      pulse: "500 messages, 20 files",
      atlas: "20 repos",
      sentinel: "1 repo, 50 PRs / mo",
      forge: "5 issues / mo",
      radar: "30 investigations / mo",
      relay: "20 analyses / mo",
      seats: "1 seat",
    },
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 99,
    priceYearly: 990,
    description: "Shared workspace for engineering teams.",
    cta: "Start Team",
    features: [
      "Everything in Pro",
      "Clerk Organizations workspace",
      "5 seats included (+$15/seat)",
      "Deeper model passes",
      "Priority support",
    ],
    limits: {
      blueprint: "200 reviews / mo",
      pulse: "2k messages, unlimited files",
      atlas: "Unlimited + private",
      sentinel: "10 repos, 300 PRs / mo",
      forge: "30 issues / mo",
      radar: "100 investigations / mo",
      relay: "100 analyses / mo",
      seats: "5 seats included",
    },
  },
];
