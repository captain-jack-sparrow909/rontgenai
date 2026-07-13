import { completeChat } from "../llm.js";
import type { IssueSnapshot } from "./issue.js";

export type ForgePlan = {
  summary: string;
  approach: string;
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

export async function generateForgePlan(issue: IssueSnapshot): Promise<{
  plan: ForgePlan;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Forge, a careful staff engineer at Röntgen AI.
Given a GitHub issue and limited repo context, produce a SMALL, safe implementation plan.
Prefer minimal diffs (1-5 files). Never touch secrets, .env, credentials, or lockfile-only churn.
Do not propose force-push or changes to main/master directly.

Return ONLY JSON:
{
  "summary": "one paragraph of what will be done",
  "approach": "technical approach",
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
  const files = Array.isArray(raw.files_to_touch)
    ? raw.files_to_touch.slice(0, 5).map((f) => {
        const o = f as Record<string, unknown>;
        const action = String(o.action ?? "modify");
        return {
          path: String(o.path ?? "").replace(/^\//, ""),
          action: (
            ["create", "modify", "delete"].includes(action)
              ? action
              : "modify"
          ) as "create" | "modify" | "delete",
          rationale: String(o.rationale ?? ""),
        };
      })
    : [];

  const complexity = String(raw.complexity ?? "medium");
  const plan: ForgePlan = {
    summary: String(raw.summary ?? "Implementation plan"),
    approach: String(raw.approach ?? ""),
    files_to_touch: files.filter((f) => f.path),
    steps: Array.isArray(raw.steps) ? raw.steps.map(String) : [],
    test_plan: Array.isArray(raw.test_plan) ? raw.test_plan.map(String) : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(String) : [],
    out_of_scope: Array.isArray(raw.out_of_scope)
      ? raw.out_of_scope.map(String)
      : [],
    complexity: (
      ["low", "medium", "high"].includes(complexity) ? complexity : "medium"
    ) as ForgePlan["complexity"],
  };

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
