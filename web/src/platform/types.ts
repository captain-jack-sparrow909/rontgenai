/** Shared domain types used by web BFF and future microservices. */

export type PlanId = "free" | "pro" | "team";

export type ProductId =
  | "blueprint"
  | "pulse"
  | "atlas"
  | "sentinel"
  | "forge"
  | "radar";

export interface UsageEvent {
  userId: string;
  organizationId?: string | null;
  product: ProductId;
  units: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface Entitlements {
  plan: PlanId;
  limits: Record<ProductId, number>;
  seats: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: { product?: ProductId; userId?: string };
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  provider: string;
}

export interface StoredObject {
  key: string;
  url?: string;
  contentType?: string;
  size?: number;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}
