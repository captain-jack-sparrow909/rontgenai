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
};

export type SentinelReviewResult = {
  summary: string;
  verdict: "approve" | "comment" | "request_changes";
  findings: SentinelFinding[];
  positives: string[];
};

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

export async function runSentinelReview(pr: PrSnapshot): Promise<{
  review: SentinelReviewResult;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Sentinel, a senior staff engineer doing PR code review at Röntgen AI.
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
      "suggestion": "optional fix idea"
    }
  ],
  "positives": ["optional good things noticed"]
}

Rules:
- line must be a line number in the NEW file (right side) when possible; use null if unknown.
- Prefer 0-12 findings ordered by severity.
- verdict=approve only if no critical/high findings.
- verdict=request_changes if any critical findings.
- Be specific to this diff; avoid generic advice.
- Skip lockfiles / generated noise.`;

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

  const raw = extractJson(result.content) as Record<string, unknown>;
  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : [];

  const findings: SentinelFinding[] = findingsRaw.map((f) => {
    const o = f as Record<string, unknown>;
    const severity = String(o.severity ?? "info").toLowerCase();
    const lineNum =
      typeof o.line === "number"
        ? o.line
        : o.line != null
          ? Number(o.line)
          : null;
    return {
      severity: (
        ["critical", "high", "medium", "low", "info"].includes(severity)
          ? severity
          : "info"
      ) as FindingSeverity,
      path: String(o.path ?? ""),
      line: lineNum && Number.isFinite(lineNum) ? Math.max(1, lineNum) : null,
      title: String(o.title ?? "Finding"),
      body: String(o.body ?? ""),
      suggestion: o.suggestion ? String(o.suggestion) : null,
    };
  });

  let verdict = String(raw.verdict ?? "comment") as SentinelReviewResult["verdict"];
  if (!["approve", "comment", "request_changes"].includes(verdict)) {
    verdict = "comment";
  }
  if (findings.some((f) => f.severity === "critical")) {
    verdict = "request_changes";
  } else if (
    findings.some((f) => f.severity === "high") &&
    verdict === "approve"
  ) {
    verdict = "comment";
  }

  return {
    review: {
      summary: String(raw.summary ?? "Review completed."),
      verdict,
      findings,
      positives: Array.isArray(raw.positives)
        ? raw.positives.map(String)
        : [],
    },
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
