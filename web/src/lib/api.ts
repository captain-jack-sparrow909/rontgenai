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
  workspace?: {
    type: "personal" | "organization";
    id: string;
    clerkOrganizationId?: string;
    name?: string;
    role: "owner" | "admin" | "member";
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
  cost_analysis?: {
    baseline: string;
    currency: string | null;
    opportunities: {
      resource: string;
      category: "idle" | "rightsizing" | "storage" | "network" | "commitment" | "architecture" | "other";
      evidence: string[];
      recommendation: string;
      monthly_savings_low: number | null;
      monthly_savings_high: number | null;
      confidence: "high" | "medium" | "low";
      effort: "small" | "medium" | "large";
      risk: "low" | "medium" | "high";
      validation: string;
    }[];
    anomalies: string[];
    quick_wins: string[];
    assumptions: string[];
    total_monthly_savings_low: number | null;
    total_monthly_savings_high: number | null;
  };
};

export type BlueprintReviewListItem = {
  id: string;
  status: string;
  title: string | null;
  descriptionPreview: string;
  scores?: BlueprintScores;
  reviewMode: "architecture" | "cost";
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
    reviewMode?: "architecture" | "cost";
    cloudInventory?: string | null;
    billingSummary?: string | null;
    optimizationConstraints?: string | null;
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
    reviewMode?: "architecture" | "cost";
    cloudInventory?: string;
    billingSummary?: string;
    optimizationConstraints?: string;
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

// ── Relay ──────────────────────────────────────────

export type RelayFinding = {
  category:
    | "cache_miss"
    | "flaky_test"
    | "duplicated_work"
    | "serialization"
    | "runner"
    | "setup"
    | "artifact"
    | "other";
  title: string;
  evidence: string[];
  impact: string;
  recommendation: string;
  validation: string;
  confidence: "high" | "medium" | "low";
  estimated_savings_percent: number | null;
};

export type RelayReport = {
  summary: string;
  pipeline_score: number;
  observed_duration: string | null;
  critical_path: string[];
  findings: RelayFinding[];
  flaky_tests: {
    test: string;
    evidence: string[];
    suspected_cause: string;
    next_step: string;
    confidence: "high" | "medium" | "low";
  }[];
  cache_analysis: {
    current_state: string;
    misses: string[];
    recommendations: string[];
  };
  duplicated_work: string[];
  workflow_graph_mermaid: string;
  prioritized_actions: string[];
  assumptions: string[];
};

export type RelayAnalysisListItem = {
  id: string;
  status: string;
  title: string;
  repository: string | null;
  summary: string | null;
  score: number | null;
  findingCount: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RelayAnalysisDetail = {
  id: string;
  status: string;
  input: {
    title?: string;
    repository?: string;
    notes?: string;
    filename?: string;
  };
  result: {
    report?: RelayReport;
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

export function createRelayAnalysis(
  token: string,
  body: {
    title?: string;
    repository?: string;
    notes?: string;
    pipelineData: string;
    filename?: string;
  },
) {
  return apiFetch<{
    ok: boolean;
    analysis: { id: string; status: string; title: string; createdAt: string };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/relay/analyses", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function listRelayAnalyses(token: string) {
  return apiFetch<{ analyses: RelayAnalysisListItem[] }>(
    "/v1/relay/analyses",
    { token },
  );
}

export function getRelayAnalysis(token: string, id: string) {
  return apiFetch<{ analysis: RelayAnalysisDetail }>(
    `/v1/relay/analyses/${id}`,
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

export type AtlasDiagramKind = "system" | "data" | "api" | "dependencies";

export type AtlasDiagram = {
  kind: AtlasDiagramKind;
  title: string;
  description: string;
  mermaid: string;
  evidence: string[];
  confidence: "high" | "medium" | "low";
};

export type AtlasReport = {
  summary: string;
  architecture_overview: string;
  /** Optional for maps created before multi-view diagram support. */
  diagrams?: AtlasDiagram[];
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

export type AtlasMigrationRequest = {
  target: string;
  constraints?: string;
  deadline?: string;
};

export type AtlasMigrationAssessment = {
  executive_summary: string;
  current_state: {
    summary: string;
    strengths: string[];
    constraints: string[];
    blockers: string[];
  };
  target_state: {
    target: string;
    architecture: string;
    benefits: string[];
    tradeoffs: string[];
  };
  diagrams: {
    stage: "current" | "target";
    title: string;
    description: string;
    mermaid: string;
    evidence: string[];
    confidence: "high" | "medium" | "low";
  }[];
  phases: {
    name: string;
    objective: string;
    changes: string[];
    dependencies: string[];
    validation: string[];
    rollback: string;
    effort: "small" | "medium" | "large";
    risk: "low" | "medium" | "high";
  }[];
  compatibility_bridges: {
    from: string;
    to: string;
    strategy: string;
    removal_gate: string;
  }[];
  testing_strategy: string[];
  rollout_strategy: string[];
  risk_register: {
    risk: string;
    impact: string;
    mitigation: string;
    confidence: "high" | "medium" | "low";
  }[];
  assumptions: string[];
};

export type AtlasMapListItem = {
  id: string;
  status: string;
  fullName: string;
  url: string | null;
  stars: number | null;
  language: string | null;
  analysisMode: "map" | "migration";
  migrationTarget: string | null;
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
  analysisMode: "map" | "migration";
  migrationRequest: AtlasMigrationRequest | null;
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
  migration: AtlasMigrationAssessment | null;
  messages: AtlasChatMessage[];
  meta: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createAtlasMap(
  token: string,
  repoUrl: string,
  options?: {
    analysisMode?: "map" | "migration";
    migrationTarget?: string;
    constraints?: string;
    deadline?: string;
  },
) {
  return apiFetch<{
    ok: boolean;
    map: {
      id: string;
      status: string;
      fullName: string;
      url: string;
      stars: number;
      language: string | null;
      analysisMode: "map" | "migration";
      migrationTarget: string | null;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/atlas/maps", {
    method: "POST",
    token,
    body: JSON.stringify({ repoUrl, ...options }),
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
  category?: string | null;
  cwe?: string | null;
  exploitability?: "high" | "medium" | "low" | null;
  attack_scenario?: string | null;
  evidence?: string[];
  confidence?: "high" | "medium" | "low";
};

export type SentinelReviewPayload = {
  summary: string;
  verdict: "approve" | "comment" | "request_changes";
  findings: SentinelFinding[];
  positives: string[];
  security_posture?: {
    attack_surface: string[];
    trust_boundaries: string[];
    sensitive_assets: string[];
    residual_risks: string[];
  };
};

export type SentinelReviewListItem = {
  id: string;
  status: string;
  prUrl: string | null;
  title: string | null;
  author: string | null;
  reviewFocus: "general" | "security";
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
  reviewFocus: "general" | "security";
  securityContext?: string | null;
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
    reviewFocus?: "general" | "security";
    securityContext?: string;
  },
) {
  return apiFetch<{
    ok: boolean;
    review: {
      id: string;
      status: string;
      prUrl: string;
      title: string;
      reviewFocus: "general" | "security";
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


// ── Forge ──────────────────────────────────────────

export type ForgePlan = {
  summary: string;
  approach: string;
  issue_type?: "bug" | "feature" | "maintenance" | "question";
  missing_information?: string[];
  reproduction?: {
    prerequisites: string[];
    steps: string[];
    expected_behavior: string;
    actual_behavior: string;
    minimal_reproduction: string;
    confidence: "high" | "medium" | "low";
  } | null;
  likely_causes?: {
    hypothesis: string;
    evidence: string[];
    affected_paths: string[];
    confidence: "high" | "medium" | "low";
  }[];
  debugging_plan?: {
    step: string;
    goal: string;
    signal: string;
  }[];
  files_to_touch: {
    path: string;
    action: "create" | "modify" | "delete";
    rationale: string;
  }[];
  steps: string[];
  test_plan: string[];
  risks: string[];
  out_of_scope: string[];
  complexity: "low" | "medium" | "high";
};

export type ForgeJobListItem = {
  id: string;
  status: string;
  stage: string;
  issueUrl: string | null;
  title: string | null;
  planSummary: string | null;
  complexity: string | null;
  prUrl: string | null;
  prNumber: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ForgeIssueCandidate = {
  id: number;
  url: string;
  repository: string;
  number: number;
  title: string;
  bodyPreview: string | null;
  labels: string[];
  author: string | null;
  assignees: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
  score: number;
  reasons: string[];
};

export type ForgeJobDetail = {
  id: string;
  status: string;
  stage: string;
  issueUrl?: string;
  issue: {
    ref: { owner: string; repo: string; number: number; url: string };
    title: string;
    body: string | null;
    author: string | null;
    labels: string[];
    state: string;
    defaultBranch: string;
    topLevel: string[];
    languages: Record<string, number> | null;
    contextFilePaths: string[];
    comments: { author: string | null; body: string }[];
  } | null;
  result: {
    stage?: string;
    plan?: ForgePlan;
    changes?: {
      path: string;
      action: string;
      note?: string;
      contentPreview?: string | null;
      bytes?: number;
    }[];
    pr?: { number: number; htmlUrl: string; branch: string };
    meta?: Record<string, unknown>;
  } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getForgeStatus(token: string) {
  return apiFetch<{
    githubAppConfigured: boolean;
    githubTokenConfigured: boolean;
    planAllows: boolean;
    plan: string;
  }>("/v1/forge/status", { token });
}

export function createForgeJob(
  token: string,
  body: { issueUrl: string; installationId?: number },
) {
  return apiFetch<{
    ok: boolean;
    job: {
      id: string;
      status: string;
      stage: string;
      issueUrl: string;
      title: string;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/forge/jobs", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function discoverForgeIssues(
  token: string,
  body: {
    query?: string;
    language?: string;
    organization?: string;
    labels?: string[];
    beginnerFriendly?: boolean;
    unassignedOnly?: boolean;
    limit?: number;
  },
) {
  return apiFetch<{ query: string; issues: ForgeIssueCandidate[] }>(
    "/v1/forge/issues/discover",
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

export function listForgeJobs(token: string) {
  return apiFetch<{ jobs: ForgeJobListItem[] }>("/v1/forge/jobs", { token });
}

export function getForgeJob(token: string, id: string) {
  return apiFetch<{ job: ForgeJobDetail }>(`/v1/forge/jobs/${id}`, { token });
}

export function approveForgeJob(token: string, id: string) {
  return apiFetch<{ ok: boolean; message: string }>(
    `/v1/forge/jobs/${id}/approve`,
    { method: "POST", token, body: "{}" },
  );
}

export function rejectForgeJob(token: string, id: string) {
  return apiFetch<{ ok: boolean; stage: string }>(
    `/v1/forge/jobs/${id}/reject`,
    { method: "POST", token, body: "{}" },
  );
}

// ── Radar ──────────────────────────────────────────

export type RadarCause = {
  rank: number;
  title: string;
  confidence: number;
  evidence: string[];
  category: string;
  remediation: string[];
};

export type RadarReport = {
  incident_summary: string;
  severity: "critical" | "high" | "medium" | "low";
  timeline: { time: string | null; event: string }[];
  likely_causes: RadarCause[];
  blast_radius: string;
  immediate_actions: string[];
  investigation_checklist: string[];
  postmortem_draft: {
    impact: string;
    detection: string;
    root_cause: string;
    resolution: string;
    lessons: string[];
  };
  related_signals: string[];
  operational_correlations: {
    signal: string;
    related_change: string;
    evidence: string[];
    confidence: "high" | "medium" | "low";
  }[];
  safe_remediations: {
    action: string;
    rationale: string;
    validation: string;
    rollback: string;
    risk: "low" | "medium" | "high";
  }[];
  approval_required: string[];
};

export type RadarInvestigationListItem = {
  id: string;
  status: string;
  title: string;
  severity: string | null;
  summary: string | null;
  errorCount: number | null;
  totalLines: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RadarInvestigationDetail = {
  id: string;
  status: string;
  title?: string;
  description?: string | null;
  metricsNotes?: string | null;
  operationsContext?: {
    deployment?: string;
    infrastructureChanges?: string;
    alerts?: string;
    serviceTopology?: string;
  } | null;
  logExcerpt?: string;
  signals: {
    totalLines?: number;
    errorCount?: number;
    warnCount?: number;
    levels?: Record<string, number>;
    topServices?: { name: string; count: number }[];
    topErrorSignatures?: { signature: string; count: number }[];
    timeRange?: { first: string | null; last: string | null };
  } | null;
  result: {
    report?: RadarReport;
    meta?: {
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      completedAt?: string;
      signals?: { totalLines?: number; errorCount?: number; warnCount?: number };
    };
  } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createRadarInvestigation(
  token: string,
  body: {
    title?: string;
    description?: string;
    metricsNotes?: string;
    logs?: string;
    logBase64?: string;
    filename?: string;
    operationsContext?: {
      deployment?: string;
      infrastructureChanges?: string;
      alerts?: string;
      serviceTopology?: string;
    };
  },
) {
  return apiFetch<{
    ok: boolean;
    investigation: {
      id: string;
      status: string;
      title: string;
      errorCount: number;
      warnCount: number;
      totalLines: number;
      createdAt: string;
    };
    usage: { used: number; limit: number; remaining: number | null };
  }>("/v1/radar/investigations", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function listRadarInvestigations(token: string) {
  return apiFetch<{ investigations: RadarInvestigationListItem[] }>(
    "/v1/radar/investigations",
    { token },
  );
}

export function getRadarInvestigation(token: string, id: string) {
  return apiFetch<{ investigation: RadarInvestigationDetail }>(
    `/v1/radar/investigations/${id}`,
    { token },
  );
}
