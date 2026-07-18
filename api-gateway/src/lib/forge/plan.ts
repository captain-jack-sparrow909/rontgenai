import { completeChat } from "../llm.js";
import type { IssueSnapshot } from "./issue.js";

export type ForgeIssueType = "bug" | "feature" | "maintenance" | "question";

export type ForgeReproduction = {
  prerequisites: string[];
  steps: string[];
  expected_behavior: string;
  actual_behavior: string;
  minimal_reproduction: string;
  confidence: "high" | "medium" | "low";
};

export type ForgePlan = {
  summary: string;
  approach: string;
  issue_type: ForgeIssueType;
  missing_information: string[];
  reproduction: ForgeReproduction | null;
  likely_causes: {
    hypothesis: string;
    evidence: string[];
    affected_paths: string[];
    confidence: "high" | "medium" | "low";
  }[];
  debugging_plan: {
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

export type ForgeFileChange = {
  path: string;
  action: "create" | "modify" | "delete";
  content?: string | null;
  /** brief note */
  note?: string;
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

function stringArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function confidence(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "medium").toLowerCase();
  return ["high", "medium", "low"].includes(normalized)
    ? (normalized as "high" | "medium" | "low")
    : "medium";
}

export function normalizeForgePlan(raw: Record<string, unknown>): ForgePlan {
  const files = Array.isArray(raw.files_to_touch)
    ? raw.files_to_touch.slice(0, 5).map((item) => {
        const file = item as Record<string, unknown>;
        const action = String(file.action ?? "modify");
        return {
          path: String(file.path ?? "").replace(/^\//, ""),
          action: (
            ["create", "modify", "delete"].includes(action)
              ? action
              : "modify"
          ) as "create" | "modify" | "delete",
          rationale: String(file.rationale ?? ""),
        };
      })
    : [];

  const complexity = String(raw.complexity ?? "medium");
  const issueTypeValue = String(raw.issue_type ?? "maintenance").toLowerCase();
  const issueType = ["bug", "feature", "maintenance", "question"].includes(
    issueTypeValue,
  )
    ? (issueTypeValue as ForgeIssueType)
    : "maintenance";

  const reproductionRaw =
    raw.reproduction && typeof raw.reproduction === "object"
      ? (raw.reproduction as Record<string, unknown>)
      : null;
  const reproduction: ForgeReproduction | null =
    issueType === "bug" && reproductionRaw
      ? {
          prerequisites: stringArray(reproductionRaw.prerequisites, 12),
          steps: stringArray(reproductionRaw.steps, 15),
          expected_behavior: String(
            reproductionRaw.expected_behavior ?? "",
          ).trim(),
          actual_behavior: String(reproductionRaw.actual_behavior ?? "").trim(),
          minimal_reproduction: String(
            reproductionRaw.minimal_reproduction ?? "",
          ).trim(),
          confidence: confidence(reproductionRaw.confidence),
        }
      : null;

  const likelyCauses = Array.isArray(raw.likely_causes)
    ? raw.likely_causes
        .slice(0, 4)
        .map((item) => {
          const cause = item as Record<string, unknown>;
          return {
            hypothesis: String(cause.hypothesis ?? "").trim(),
            evidence: stringArray(cause.evidence, 8),
            affected_paths: stringArray(cause.affected_paths, 8).map((path) =>
              path.replace(/^\//, ""),
            ),
            confidence: confidence(cause.confidence),
          };
        })
        .filter((cause) => cause.hypothesis)
    : [];

  const debuggingPlan = Array.isArray(raw.debugging_plan)
    ? raw.debugging_plan
        .slice(0, 8)
        .map((item) => {
          const step = item as Record<string, unknown>;
          return {
            step: String(step.step ?? "").trim(),
            goal: String(step.goal ?? "").trim(),
            signal: String(step.signal ?? "").trim(),
          };
        })
        .filter((step) => step.step)
    : [];

  return {
    summary: String(raw.summary ?? "Implementation plan"),
    approach: String(raw.approach ?? ""),
    issue_type: issueType,
    missing_information: stringArray(raw.missing_information, 12),
    reproduction,
    likely_causes: issueType === "bug" ? likelyCauses : [],
    debugging_plan: issueType === "bug" ? debuggingPlan : [],
    files_to_touch: files.filter((file) => file.path),
    steps: stringArray(raw.steps),
    test_plan: stringArray(raw.test_plan),
    risks: stringArray(raw.risks),
    out_of_scope: stringArray(raw.out_of_scope),
    complexity: (
      ["low", "medium", "high"].includes(complexity) ? complexity : "medium"
    ) as ForgePlan["complexity"],
  };
}

export async function generateForgePlan(issue: IssueSnapshot): Promise<{
  plan: ForgePlan;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Forge, a careful staff engineer and bug reproduction specialist at Röntgen AI.
Given a GitHub issue and limited repo context, first classify and diagnose the
report, then produce a SMALL, safe implementation plan.
Prefer minimal diffs (1-5 files). Never touch secrets, .env, credentials, or lockfile-only churn.
Do not propose force-push or changes to main/master directly.

Return ONLY JSON:
{
  "summary": "one paragraph of what will be done",
  "approach": "technical approach",
  "issue_type": "bug|feature|maintenance|question",
  "missing_information": ["specific fact needed to reproduce or implement"],
  "reproduction": {
    "prerequisites": ["required setup/state"],
    "steps": ["numbered action in deterministic order"],
    "expected_behavior": "what should happen",
    "actual_behavior": "what the report says happens",
    "minimal_reproduction": "smallest practical reproduction harness or scenario",
    "confidence": "high|medium|low"
  },
  "likely_causes": [
    {
      "hypothesis": "concrete technical cause",
      "evidence": ["issue detail or repository evidence"],
      "affected_paths": ["src/path.ts"],
      "confidence": "high|medium|low"
    }
  ],
  "debugging_plan": [
    {
      "step": "diagnostic action",
      "goal": "what this isolates",
      "signal": "observation that confirms or rejects the hypothesis"
    }
  ],
  "files_to_touch": [
    {"path":"src/…","action":"create|modify|delete","rationale":"…"}
  ],
  "steps": ["step 1", "step 2"],
  "test_plan": ["how to verify"],
  "risks": ["…"],
  "out_of_scope": ["…"],
  "complexity": "low|medium|high"
}

Rules:
- For non-bugs, set reproduction to null and keep likely_causes/debugging_plan empty.
- Never invent observed behavior. Put unknown details in missing_information and
  lower confidence when the report cannot be reproduced from supplied evidence.
- Reproduction steps must be actionable and deterministic, not generic advice.
- Rank at most 4 likely causes by evidence and confidence.
- Provide at most 8 debugging steps, ordered from cheapest/highest-signal first.
- Max 5 files in files_to_touch.
- Prefer modify over large rewrites.
- If issue is vague, plan discovery steps but still list likely files.
- complexity high if multi-system or unclear requirements.`;

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            issue: {
              title: issue.title,
              body: issue.body,
              labels: issue.labels,
              author: issue.author,
              comments: issue.comments.slice(0, 8),
            },
            repo: {
              defaultBranch: issue.defaultBranch,
              topLevel: issue.topLevel,
              languages: issue.languages,
            },
            contextFiles: issue.contextFiles.map((f) => ({
              path: f.path,
              content: f.content.slice(0, 5000),
            })),
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.2,
    maxTokens: 3500,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;
  const plan = normalizeForgePlan(raw);

  return {
    plan,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export async function generateForgeChanges(opts: {
  issue: IssueSnapshot;
  plan: ForgePlan;
}): Promise<{
  changes: ForgeFileChange[];
  prTitle: string;
  prBody: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Forge implementing an approved plan for a GitHub issue.
Generate COMPLETE file contents for each change (not diffs).
Constraints:
- Max 5 files
- No secrets, .env*, credentials, private keys
- Keep changes focused on the plan
- For modify: provide full new file content
- For delete: content null
- For create: full new file content

Return ONLY JSON:
{
  "prTitle": "short PR title",
  "prBody": "markdown PR description with Plan / Changes / Test plan sections",
  "changes": [
    {"path":"src/x.ts","action":"modify","content":"…full file…","note":"what changed"}
  ]
}`;

  // Re-fetch file contents for files we will modify
  const existing: Record<string, string> = {};
  for (const f of opts.issue.contextFiles) {
    existing[f.path] = f.content;
  }

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            issue: {
              title: opts.issue.title,
              body: opts.issue.body,
              number: opts.issue.ref.number,
              url: opts.issue.ref.url,
            },
            plan: opts.plan,
            existingFiles: opts.plan.files_to_touch.map((f) => ({
              path: f.path,
              action: f.action,
              currentContent: existing[f.path]?.slice(0, 8000) ?? null,
            })),
            extraContext: opts.issue.contextFiles
              .filter(
                (f) =>
                  !opts.plan.files_to_touch.some((t) => t.path === f.path),
              )
              .slice(0, 6)
              .map((f) => ({
                path: f.path,
                content: f.content.slice(0, 3000),
              })),
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.15,
    maxTokens: 8000,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;
  const changesRaw = Array.isArray(raw.changes) ? raw.changes : [];

  const blocked = /(\.env|credentials|id_rsa|\.pem|secret|private[_-]?key)/i;
  const changes: ForgeFileChange[] = changesRaw
    .slice(0, 5)
    .map((c) => {
      const o = c as Record<string, unknown>;
      const path = String(o.path ?? "").replace(/^\//, "");
      const action = String(o.action ?? "modify");
      return {
        path,
        action: (
          ["create", "modify", "delete"].includes(action)
            ? action
            : "modify"
        ) as ForgeFileChange["action"],
        content:
          o.content === null || o.content === undefined
            ? null
            : String(o.content),
        note: o.note ? String(o.note) : undefined,
      };
    })
    .filter((c) => c.path && !blocked.test(c.path));

  if (!changes.length) {
    throw new Error("Model produced no valid file changes");
  }

  return {
    changes,
    prTitle: String(
      raw.prTitle ?? `fix: ${opts.issue.title}`.slice(0, 72),
    ),
    prBody: String(
      raw.prBody ??
        `## Plan\n${opts.plan.summary}\n\n## Test plan\n${opts.plan.test_plan.map((t) => `- ${t}`).join("\n")}\n\nCloses #${opts.issue.ref.number}`,
    ),
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
