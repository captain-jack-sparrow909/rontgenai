/**
 * Client for the Röntgen API gateway.
 * Authenticated calls use a Clerk session JWT as Bearer token.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await parseJson(res);
  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ||
      `API ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

export type MeResponse = {
  profile: {
    id: string;
    clerkUserId: string;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
  subscription: {
    plan: "free" | "pro" | "team";
    status: string;
    provider: string;
    currentPeriodEnd: string | null;
  };
  entitlements: {
    limits: Record<string, number>;
    seats: number;
  };
  usage: Record<
    string,
    { used: number; limit: number; remaining: number | null }
  >;
};

export function joinWaitlist(email: string, product = "general") {
  return apiFetch<{ ok: boolean; message: string }>("/v1/waitlist", {
    method: "POST",
    body: JSON.stringify({ email, product }),
  });
}

export function fetchMe(token: string) {
  return apiFetch<MeResponse>("/v1/me", { token });
}

export function createCheckout(
  token: string,
  plan: "pro" | "team",
  interval: "month" | "year" = "month",
) {
  return apiFetch<{
    ok: boolean;
    provider: string;
    env: string;
    priceId: string;
    customer: {
      email: string | null | undefined;
      clerkUserId: string;
      profileId: string;
    };
    customData: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }>("/v1/billing/checkout", {
    method: "POST",
    token,
    body: JSON.stringify({ plan, interval }),
  });
}

// ── Blueprint ──────────────────────────────────────

export type BlueprintScores = {
  scalability: number;
  reliability: number;
  security: number;
  cost_efficiency: number;
  overall: number;
};

export type BlueprintFinding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  detail: string;
  recommendation: string;
};

export type BlueprintReviewPayload = {
  summary: string;
  scores: BlueprintScores;
  findings: BlueprintFinding[];
  tradeoffs: string[];
  next_steps: string[];
  architecture_notes?: string;
};

export type BlueprintReviewListItem = {
  id: string;
  status: string;
  title: string | null;
  descriptionPreview: string;
  scores?: BlueprintScores;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlueprintReviewDetail = {
  id: string;
  status: string;
  type: string;
  input: {
    title?: string | null;
    description?: string;
    mermaid?: string | null;
    r2_key?: string | null;
  };
  result: {
    review?: BlueprintReviewPayload;
    meta?: {
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      completedAt?: string;
    };
  } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createBlueprintReview(
  token: string,
  body: {
    title?: string;
    description?: string;
    mermaid?: string;
    imageBase64?: string;
    imageContentType?: string;
    filename?: string;
  },
) {
  return apiFetch<{
    ok: boolean;
    review: { id: string; status: string; createdAt: string };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/blueprint/reviews", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function listBlueprintReviews(token: string) {
  return apiFetch<{ reviews: BlueprintReviewListItem[] }>(
    "/v1/blueprint/reviews",
    { token },
  );
}

export function getBlueprintReview(token: string, id: string) {
  return apiFetch<{ review: BlueprintReviewDetail }>(
    `/v1/blueprint/reviews/${id}`,
    { token },
  );
}

