import { completeChat, type ChatMessage } from "../llm.js";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type BlueprintFinding = {
  severity: FindingSeverity;
  category:
    | "scalability"
    | "reliability"
    | "security"
    | "cost"
    | "design"
    | "operations";
  title: string;
  detail: string;
  recommendation: string;
};

export type BlueprintReviewResult = {
  summary: string;
  scores: {
    scalability: number;
    reliability: number;
    security: number;
    cost_efficiency: number;
    overall: number;
  };
  findings: BlueprintFinding[];
  tradeoffs: string[];
  next_steps: string[];
  architecture_notes?: string;
  cost_analysis?: BlueprintCostAnalysis;
};

export type BlueprintCostAnalysis = {
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

const SYSTEM_PROMPT = `You are Blueprint, a senior staff+ system design reviewer at Röntgen AI.
You review distributed systems and application architecture for production readiness.

Analyze architecture descriptions, Mermaid diagrams, and/or diagram images for:
- Scalability (horizontal scaling, bottlenecks, capacity)
- Reliability (SPOF, failure modes, redundancy, timeouts, retries)
- Security (trust boundaries, authn/z, data exposure)
- Cost efficiency (over-provisioning, chatty calls, storage)
- Design tradeoffs and operational concerns

Respond with ONLY valid JSON matching this schema:
{
  "summary": "2-4 sentence executive summary",
  "scores": {
    "scalability": 1-10,
    "reliability": 1-10,
    "security": 1-10,
    "cost_efficiency": 1-10,
    "overall": 1-10
  },
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "scalability|reliability|security|cost|design|operations",
      "title": "short title",
      "detail": "what is wrong / observation",
      "recommendation": "concrete next action"
    }
  ],
  "tradeoffs": ["key design tradeoffs observed"],
  "next_steps": ["prioritized actions"],
  "architecture_notes": "optional brief structural notes"
}

Rules:
- Be specific and actionable; avoid generic fluff.
- Prefer 4-12 findings ordered by severity.
- If information is missing, note assumptions under info severity.
- Scores must be integers 1-10.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(1, Math.min(10, Math.round(v)));
}

function stringArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function nullableMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

export function normalizeBlueprintResult(raw: unknown): BlueprintReviewResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const scores = (o.scores ?? {}) as Record<string, unknown>;
  const findingsRaw = Array.isArray(o.findings) ? o.findings : [];

  const findings: BlueprintFinding[] = findingsRaw.map((f) => {
    const item = f as Record<string, unknown>;
    const severity = String(item.severity ?? "info").toLowerCase();
    const category = String(item.category ?? "design").toLowerCase();
    return {
      severity: (
        ["critical", "high", "medium", "low", "info"].includes(severity)
          ? severity
          : "info"
      ) as FindingSeverity,
      category: (
        [
          "scalability",
          "reliability",
          "security",
          "cost",
          "design",
          "operations",
        ].includes(category)
          ? category
          : "design"
      ) as BlueprintFinding["category"],
      title: String(item.title ?? "Finding"),
      detail: String(item.detail ?? ""),
      recommendation: String(item.recommendation ?? ""),
    };
  });

  const cost = (o.cost_analysis && typeof o.cost_analysis === "object"
    ? o.cost_analysis
    : null) as Record<string, unknown> | null;
  const costAnalysis: BlueprintCostAnalysis | undefined = cost
    ? {
        baseline: String(cost.baseline ?? "No reliable spend baseline supplied.").slice(0, 2500),
        currency: cost.currency ? String(cost.currency).slice(0, 12) : null,
        opportunities: Array.isArray(cost.opportunities)
          ? cost.opportunities.slice(0, 20).map((opportunity) => {
              const item = (opportunity && typeof opportunity === "object" ? opportunity : {}) as Record<string, unknown>;
              const category = String(item.category ?? "other").toLowerCase();
              const confidence = String(item.confidence ?? "medium").toLowerCase();
              const effort = String(item.effort ?? "medium").toLowerCase();
              const risk = String(item.risk ?? "medium").toLowerCase();
              return {
                resource: String(item.resource ?? "Unknown resource").slice(0, 300),
                category: (["idle", "rightsizing", "storage", "network", "commitment", "architecture"].includes(category) ? category : "other") as BlueprintCostAnalysis["opportunities"][number]["category"],
                evidence: stringArray(item.evidence, 10),
                recommendation: String(item.recommendation ?? "").slice(0, 1600),
                monthly_savings_low: nullableMoney(item.monthly_savings_low),
                monthly_savings_high: nullableMoney(item.monthly_savings_high),
                confidence: (["high", "low"].includes(confidence) ? confidence : "medium") as "high" | "medium" | "low",
                effort: (["small", "large"].includes(effort) ? effort : "medium") as "small" | "medium" | "large",
                risk: (["low", "high"].includes(risk) ? risk : "medium") as "low" | "medium" | "high",
                validation: String(item.validation ?? "Validate utilization and billing data before making changes.").slice(0, 1200),
              };
            })
          : [],
        anomalies: stringArray(cost.anomalies, 20),
        quick_wins: stringArray(cost.quick_wins, 20),
        assumptions: stringArray(cost.assumptions, 20),
        total_monthly_savings_low: nullableMoney(cost.total_monthly_savings_low),
        total_monthly_savings_high: nullableMoney(cost.total_monthly_savings_high),
      }
    : undefined;

  return {
    summary: String(o.summary ?? "Review completed."),
    scores: {
      scalability: clampScore(scores.scalability),
      reliability: clampScore(scores.reliability),
      security: clampScore(scores.security),
      cost_efficiency: clampScore(scores.cost_efficiency),
      overall: clampScore(scores.overall),
    },
    findings,
    tradeoffs: Array.isArray(o.tradeoffs)
      ? o.tradeoffs.map(String)
      : [],
    next_steps: Array.isArray(o.next_steps)
      ? o.next_steps.map(String)
      : [],
    architecture_notes: o.architecture_notes
      ? String(o.architecture_notes)
      : undefined,
    ...(costAnalysis ? { cost_analysis: costAnalysis } : {}),
  };
}

export async function runBlueprintReview(input: {
  title?: string;
  description: string;
  mermaid?: string;
  /** data URL or https URL for image */
  imageUrl?: string;
  reviewMode?: "architecture" | "cost";
  cloudInventory?: string;
  billingSummary?: string;
  optimizationConstraints?: string;
}): Promise<{
  review: BlueprintReviewResult;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const parts: string[] = [];
  if (input.title) parts.push(`# Title\n${input.title}`);
  parts.push(`# Architecture description\n${input.description}`);
  if (input.mermaid?.trim()) {
    parts.push(`# Mermaid diagram\n\`\`\`mermaid\n${input.mermaid.trim()}\n\`\`\``);
  }
  if (input.reviewMode === "cost") {
    if (input.cloudInventory?.trim()) parts.push(`# Cloud inventory\n${input.cloudInventory.slice(0, 120_000)}`);
    if (input.billingSummary?.trim()) parts.push(`# Billing and usage export\n${input.billingSummary.slice(0, 120_000)}`);
    if (input.optimizationConstraints?.trim()) parts.push(`# Constraints\n${input.optimizationConstraints.slice(0, 5000)}`);
  }

  const systemPrompt = input.reviewMode === "cost"
    ? `${SYSTEM_PROMPT}\n\nCLOUD COST REVIEW MODE:
- Treat all cloud access as read-only. Never claim to terminate, resize, purchase, or modify a resource.
- Use the supplied inventory, billing, utilization, and architecture evidence to find idle resources, rightsizing, storage/network waste, commitment opportunities, anomalies, and architectural savings.
- Do not invent provider prices, utilization, spend, or savings. Use null savings when the supplied evidence cannot support a monetary estimate.
- Avoid double-counting overlapping opportunities. Make risks and validation steps explicit.
- Also include:
"cost_analysis": {
  "baseline": "what spend/usage baseline is evidenced",
  "currency": "USD or null",
  "opportunities": [{"resource":"…","category":"idle|rightsizing|storage|network|commitment|architecture|other","evidence":["…"],"recommendation":"…","monthly_savings_low":null,"monthly_savings_high":null,"confidence":"high|medium|low","effort":"small|medium|large","risk":"low|medium|high","validation":"…"}],
  "anomalies": ["…"], "quick_wins": ["…"], "assumptions": ["…"],
  "total_monthly_savings_low": null, "total_monthly_savings_high": null
}`
    : SYSTEM_PROMPT;

  const userContent: ChatMessage["content"] = input.imageUrl
    ? [
        { type: "text", text: parts.join("\n\n") },
        { type: "image_url", image_url: { url: input.imageUrl } },
      ]
    : parts.join("\n\n");

  // DeepSeek chat may not support vision; try multimodal then fall back to text.
  let result;
  try {
    result = await completeChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    });
  } catch (err) {
    if (!input.imageUrl) throw err;
    // Fallback: text-only with note about diagram
    const textOnly = `${parts.join("\n\n")}\n\n# Note\nA diagram image was uploaded but the model could not process images. Review from text/Mermaid only. Assume the diagram matches the description.`;
    result = await completeChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: textOnly },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    });
  }

  const parsed = normalizeBlueprintResult(extractJson(result.content));
  return {
    review: parsed,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
