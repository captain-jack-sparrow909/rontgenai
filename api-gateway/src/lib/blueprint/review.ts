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

function normalizeResult(raw: unknown): BlueprintReviewResult {
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
  };
}

export async function runBlueprintReview(input: {
  title?: string;
  description: string;
  mermaid?: string;
  /** data URL or https URL for image */
  imageUrl?: string;
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
        { role: "system", content: SYSTEM_PROMPT },
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: textOnly },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    });
  }

  const parsed = normalizeResult(extractJson(result.content));
  return {
    review: parsed,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
