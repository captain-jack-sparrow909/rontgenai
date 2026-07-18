import { completeChat } from "../llm.js";
import type { PrSnapshot } from "./github.js";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type SentinelFinding = {
  severity: FindingSeverity;
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

export type SentinelReviewResult = {
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

export type SentinelReviewFocus = "general" | "security";

function stringArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function boundedString(value: unknown, fallback = "", limit = 2000): string {
  return String(value ?? fallback).trim().slice(0, limit);
}

function confidence(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "medium").toLowerCase();
  return normalized === "high" || normalized === "low" ? normalized : "medium";
}

export function normalizeSentinelReview(value: unknown): SentinelReviewResult {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];
  const findings: SentinelFinding[] = findingsRaw.slice(0, 20).map((f) => {
    const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    const severity = String(o.severity ?? "info").toLowerCase();
    const lineNum = typeof o.line === "number" ? o.line : o.line != null ? Number(o.line) : null;
    const exploitability = String(o.exploitability ?? "").toLowerCase();
    return {
      severity: (["critical", "high", "medium", "low", "info"].includes(severity) ? severity : "info") as FindingSeverity,
      path: boundedString(o.path, "", 500),
      line: lineNum && Number.isFinite(lineNum) ? Math.max(1, lineNum) : null,
      title: boundedString(o.title, "Finding", 200),
      body: boundedString(o.body, "", 3000),
      suggestion: o.suggestion ? boundedString(o.suggestion, "", 2000) : null,
      category: o.category ? boundedString(o.category, "", 100) : null,
      cwe: o.cwe ? boundedString(o.cwe, "", 30) : null,
      exploitability: (["high", "medium", "low"].includes(exploitability) ? exploitability : null) as SentinelFinding["exploitability"],
      attack_scenario: o.attack_scenario ? boundedString(o.attack_scenario, "", 1600) : null,
      evidence: stringArray(o.evidence, 10),
      confidence: confidence(o.confidence),
    };
  });

  let verdict = String(raw.verdict ?? "comment") as SentinelReviewResult["verdict"];
  if (!["approve", "comment", "request_changes"].includes(verdict)) verdict = "comment";
  if (findings.some((finding) => finding.severity === "critical")) verdict = "request_changes";
  else if (findings.some((finding) => finding.severity === "high") && verdict === "approve") verdict = "comment";

  const posture = (raw.security_posture && typeof raw.security_posture === "object"
    ? raw.security_posture
    : null) as Record<string, unknown> | null;

  return {
    summary: boundedString(raw.summary, "Review completed.", 3000),
    verdict,
    findings,
    positives: stringArray(raw.positives, 20),
    ...(posture
      ? {
          security_posture: {
            attack_surface: stringArray(posture.attack_surface, 15),
            trust_boundaries: stringArray(posture.trust_boundaries, 15),
            sensitive_assets: stringArray(posture.sensitive_assets, 15),
            residual_risks: stringArray(posture.residual_risks, 15),
          },
        }
      : {}),
  };
}

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

export async function runSentinelReview(
  pr: PrSnapshot,
  opts: { focus?: SentinelReviewFocus; securityContext?: string } = {},
): Promise<{
  review: SentinelReviewResult;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const securityFocus = opts.focus === "security";
  const system = `You are Sentinel, a senior staff engineer doing ${securityFocus ? "an adversarial security review" : "PR code review"} at Röntgen AI.
Review the pull request diff for bugs, security issues, race conditions, incorrect error handling, performance footguns, and maintainability.
Do NOT nitpick pure style or formatting unless it causes bugs.

Return ONLY JSON:
{
  "summary": "2-4 sentence review summary for the PR body",
  "verdict": "approve|comment|request_changes",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "path": "path/from/diff",
      "line": 12,
      "title": "short title",
      "body": "what is wrong and why (markdown ok)",
      "suggestion": "optional fix idea",
      "category": "auth|access-control|injection|secrets|crypto|ssrf|xss|csrf|supply-chain|config|data-exposure|other",
      "cwe": "CWE-### or null",
      "exploitability": "high|medium|low or null",
      "attack_scenario": "concrete abuse path or null",
      "evidence": ["specific diff evidence"],
      "confidence": "high|medium|low"
    }
  ],
  "positives": ["optional good things noticed"],
  "security_posture": {
    "attack_surface": ["changed entrypoints exposed to attackers"],
    "trust_boundaries": ["boundary crossed by changed code"],
    "sensitive_assets": ["credentials, user data, privileged operations"],
    "residual_risks": ["security risks not provable from the diff"]
  }
}

Rules:
- line must be a line number in the NEW file (right side) when possible; use null if unknown.
- Prefer 0-12 findings ordered by severity.
- verdict=approve only if no critical/high findings.
- verdict=request_changes if any critical findings.
- Be specific to this diff; avoid generic advice.
- Skip lockfiles / generated noise.
${securityFocus ? `- Focus on exploitable security behavior, authorization, input flows, secrets, dependencies, and configuration/IaC changes.
- Map security findings to a CWE only when the mapping is credible; never invent a CVE.
- Describe attacker prerequisites and the abuse path. Separate confirmed evidence from assumptions.
- Do not approve automatically: security-focused reviews are advisory and require a human decision.` : "- security_posture may be omitted unless it materially helps explain a security finding."}`;

  const filePayload = pr.files.map((f) => ({
    path: f.path,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            title: pr.title,
            body: pr.body,
            author: pr.author,
            base: pr.base,
            head: pr.head,
            draft: pr.draft,
            focus: opts.focus ?? "general",
            securityContext: opts.securityContext?.slice(0, 3000) ?? null,
            files: filePayload,
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.15,
    maxTokens: 4500,
    jsonMode: true,
  });

  const review = normalizeSentinelReview(extractJson(result.content));
  if (securityFocus && review.verdict === "approve") review.verdict = "comment";

  return {
    review,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export function reviewBodyMarkdown(
  review: SentinelReviewResult,
  opts?: { autoApprove?: boolean },
): string {
  const counts = review.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const lines = [
    "### 🛡️ Sentinel review",
    "",
    review.summary,
    "",
    `**Verdict:** \`${review.verdict}\`` +
      (opts?.autoApprove && review.verdict === "approve"
        ? " (auto-approve enabled)"
        : ""),
    "",
    `Findings: critical ${counts.critical ?? 0} · high ${counts.high ?? 0} · medium ${counts.medium ?? 0} · low ${counts.low ?? 0}`,
  ];

  if (review.positives?.length) {
    lines.push("", "**Positives**", ...review.positives.map((p) => `- ${p}`));
  }

  lines.push(
    "",
    "_Reviewed by [Röntgen AI · Sentinel](https://rontgenai.dev)_",
  );
  return lines.join("\n");
}

export function toGithubEvent(
  verdict: SentinelReviewResult["verdict"],
  autoApprove: boolean,
): "COMMENT" | "APPROVE" | "REQUEST_CHANGES" {
  if (verdict === "request_changes") return "REQUEST_CHANGES";
  if (verdict === "approve" && autoApprove) return "APPROVE";
  return "COMMENT";
}
