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

// ── Pulse ──────────────────────────────────────────

export type PulseColumnProfile = {
  name: string;
  type: string;
  nullCount: number;
  uniqueApprox: number;
  sampleValues: string[];
  min?: number | null;
  max?: number | null;
  mean?: number | null;
};

export type PulseChartSpec = {
  type: "bar" | "line" | "area" | "pie";
  title: string;
  xKey: string;
  yKey: string;
  data: Record<string, string | number>[];
};

export type PulseTableSpec = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type PulseChatMessage = {
  role: "user" | "assistant";
  content: string;
  sql?: string | null;
  chart?: PulseChartSpec | null;
  table?: PulseTableSpec | null;
  createdAt: string;
};

export type PulseBootstrap = {
  summary: string;
  key_insights: string[];
  suggested_questions: string[];
  chart?: PulseChartSpec | null;
};

export type PulseSessionListItem = {
  id: string;
  status: string;
  title: string;
  filename: string | null;
  rowCount: number | null;
  columnCount: number | null;
  summary: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PulseSessionDetail = {
  id: string;
  status: string;
  title: string;
  filename?: string;
  profile: {
    rowCount: number;
    columnCount: number;
    columns: PulseColumnProfile[];
    sampleRows: Record<string, unknown>[];
    filename: string;
  } | null;
  bootstrap: PulseBootstrap | null;
  messages: PulseChatMessage[];
  meta: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createPulseSession(
  token: string,
  body: {
    title?: string;
    filename: string;
    fileBase64: string;
    contentType?: string;
  },
) {
  return apiFetch<{
    ok: boolean;
    session: {
      id: string;
      status: string;
      title: string;
      filename: string;
      rowCount: number;
      columnCount: number;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/pulse/sessions", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function listPulseSessions(token: string) {
  return apiFetch<{ sessions: PulseSessionListItem[] }>("/v1/pulse/sessions", {
    token,
  });
}

export function getPulseSession(token: string, id: string) {
  return apiFetch<{ session: PulseSessionDetail }>(
    `/v1/pulse/sessions/${id}`,
    { token },
  );
}

export function chatPulseSession(token: string, id: string, message: string) {
  return apiFetch<{
    ok: boolean;
    message: PulseChatMessage;
    usage: { used: number; limit: number; remaining: number | null };
  }>(`/v1/pulse/sessions/${id}/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}

// ── Atlas ──────────────────────────────────────────

export type AtlasReport = {
  summary: string;
  architecture_overview: string;
  mermaid: string;
  modules: { name: string; path: string; role: string }[];
  tech_stack: string[];
  how_to_run: string[];
  how_to_contribute: string[];
  entrypoints: string[];
  risks: string[];
  onboarding_checklist: string[];
};

export type AtlasChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AtlasMapListItem = {
  id: string;
  status: string;
  fullName: string;
  url: string | null;
  stars: number | null;
  language: string | null;
  summary: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AtlasMapDetail = {
  id: string;
  status: string;
  fullName?: string;
  url?: string;
  snapshot: {
    ref: { owner: string; repo: string; fullName: string; url: string };
    meta: {
      description: string | null;
      defaultBranch: string;
      language: string | null;
      stars: number;
      forks: number;
      openIssues: number;
      license: string | null;
      topics: string[];
    };
    tree: {
      totalFiles: number;
      totalDirs: number;
      topLevel: string[];
      extensions: Record<string, number>;
      directories: string[];
      importantPaths: string[];
    };
    readmePreview: string | null;
    keyFilePaths: string[];
  } | null;
  report: AtlasReport | null;
  messages: AtlasChatMessage[];
  meta: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createAtlasMap(token: string, repoUrl: string) {
  return apiFetch<{
    ok: boolean;
    map: {
      id: string;
      status: string;
      fullName: string;
      url: string;
      stars: number;
      language: string | null;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/atlas/maps", {
    method: "POST",
    token,
    body: JSON.stringify({ repoUrl }),
  });
}

export function listAtlasMaps(token: string) {
  return apiFetch<{ maps: AtlasMapListItem[] }>("/v1/atlas/maps", { token });
}

export function getAtlasMap(token: string, id: string) {
  return apiFetch<{ map: AtlasMapDetail }>(`/v1/atlas/maps/${id}`, { token });
}

export function chatAtlasMap(token: string, id: string, message: string) {
  return apiFetch<{
    ok: boolean;
    message: AtlasChatMessage;
    usage: { used: number; limit: number; remaining: number | null };
  }>(`/v1/atlas/maps/${id}/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}

// ── Sentinel ───────────────────────────────────────

export type SentinelFinding = {
  severity: "critical" | "high" | "medium" | "low" | "info";
  path: string;
  line: number | null;
  title: string;
  body: string;
  suggestion?: string | null;
};

export type SentinelReviewPayload = {
  summary: string;
  verdict: "approve" | "comment" | "request_changes";
  findings: SentinelFinding[];
  positives: string[];
};

export type SentinelReviewListItem = {
  id: string;
  status: string;
  prUrl: string | null;
  title: string | null;
  author: string | null;
  verdict: string | null;
  findingCount: number | null;
  githubReviewUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SentinelReviewDetail = {
  id: string;
  status: string;
  prUrl?: string;
  title?: string;
  author?: string;
  postToGithub?: boolean;
  autoApprove?: boolean;
  files: {
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }[];
  result: {
    review?: SentinelReviewPayload;
    github?: { reviewId?: number; htmlUrl?: string };
    postError?: string | null;
    meta?: {
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      filesReviewed?: number;
      completedAt?: string;
    };
  } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getSentinelStatus(token: string) {
  return apiFetch<{
    githubAppConfigured: boolean;
    githubTokenConfigured: boolean;
    appSlug: string | null;
    installUrl: string | null;
    planAllows: boolean;
    plan: string;
  }>("/v1/sentinel/status", { token });
}

export function createSentinelReview(
  token: string,
  body: {
    prUrl: string;
    postToGithub?: boolean;
    autoApprove?: boolean;
    installationId?: number;
  },
) {
  return apiFetch<{
    ok: boolean;
    review: {
      id: string;
      status: string;
      prUrl: string;
      title: string;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/sentinel/reviews", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function listSentinelReviews(token: string) {
  return apiFetch<{ reviews: SentinelReviewListItem[] }>(
    "/v1/sentinel/reviews",
    { token },
  );
}

export function getSentinelReview(token: string, id: string) {
  return apiFetch<{ review: SentinelReviewDetail }>(
    `/v1/sentinel/reviews/${id}`,
    { token },
  );
}

export function claimSentinelInstallation(
  token: string,
  body: {
    installationId: number;
    accountLogin?: string;
    accountType?: string;
  },
) {
  return apiFetch<{ ok: boolean; installation: unknown }>(
    "/v1/sentinel/installations",
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

export function listSentinelInstallations(token: string) {
  return apiFetch<{
    installations: {
      id: string;
      installation_id: number;
      account_login: string | null;
      metadata: {
        autoApprove?: boolean;
        enabled?: boolean;
      } | null;
      created_at: string;
    }[];
  }>("/v1/sentinel/installations", { token });
}

export function updateSentinelSettings(
  token: string,
  body: {
    installationId: number;
    autoApprove?: boolean;
    enabled?: boolean;
  },
) {
  return apiFetch<{ ok: boolean }>(
    "/v1/sentinel/installations/settings",
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    },
  );
}

