import type { PlanId } from "@/platform/types";

export interface CheckoutSessionInput {
  userId: string;
  email: string;
  plan: Exclude<PlanId, "free">;
  interval: "month" | "year";
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionSnapshot {
  provider: string;
  customerId: string;
  subscriptionId?: string;
  plan: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled" | "none";
  currentPeriodEnd?: string;
}

/**
 * Vendor-swappable billing.
 * v1: Paddle · later: Stripe.
 */
export interface BillingProvider {
  readonly name: string;
  createCheckout(input: CheckoutSessionInput): Promise<{ url: string }>;
  getCustomerPortalUrl(customerId: string): Promise<string>;
  /**
   * Verify webhook signature and normalize event payload.
   * Implementation lives in the API service in Phase 1.
   */
  parseWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<{ type: string; data: unknown }>;
}

export class PaddleBillingProvider implements BillingProvider {
  readonly name = "paddle";

  constructor(
    private readonly apiKey = process.env.PADDLE_API_KEY,
    private readonly env = process.env.PADDLE_ENV ?? "sandbox",
  ) {}

  async createCheckout(): Promise<{ url: string }> {
    if (!this.apiKey) {
      throw new Error("PADDLE_API_KEY is not configured");
    }
    throw new Error(
      "Paddle checkout will be implemented in Phase 1 (price IDs + overlay/hosted).",
    );
  }

  async getCustomerPortalUrl(): Promise<string> {
    throw new Error("Paddle customer portal not wired yet");
  }

  async parseWebhook(): Promise<{ type: string; data: unknown }> {
    throw new Error("Paddle webhooks not wired yet");
  }
}

export class NoopBillingProvider implements BillingProvider {
  readonly name = "noop";

  async createCheckout(): Promise<{ url: string }> {
    return { url: "/app/billing" };
  }

  async getCustomerPortalUrl(): Promise<string> {
    return "/app/billing";
  }

  async parseWebhook(): Promise<{ type: string; data: unknown }> {
    return { type: "noop", data: {} };
  }
}

export function getBillingProvider(): BillingProvider {
  if (process.env.PADDLE_API_KEY) {
    return new PaddleBillingProvider();
  }
  return new NoopBillingProvider();
}
