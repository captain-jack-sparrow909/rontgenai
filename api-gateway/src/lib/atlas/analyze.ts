import { completeChat } from "../llm.js";
import type { RepoSnapshot } from "./github.js";

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

function snapshotForPrompt(snap: RepoSnapshot) {
  return {
    repo: snap.meta,
    url: snap.ref.url,
    tree: {
      totalFiles: snap.tree.totalFiles,
      totalDirs: snap.tree.totalDirs,
      topLevel: snap.tree.topLevel,
      extensions: Object.entries(snap.tree.extensions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
      directories: snap.tree.directories.slice(0, 40),
      importantPaths: snap.tree.importantPaths.slice(0, 50),
    },
    readme: snap.readme?.slice(0, 8000) ?? null,
    keyFiles: snap.keyFiles.map((f) => ({
      path: f.path,
      truncated: f.truncated,
      content: f.content.slice(0, 6000),
    })),
  };
}

export async function generateAtlasReport(snap: RepoSnapshot): Promise<{
  report: AtlasReport;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Atlas, a staff engineer onboarding expert at Röntgen AI.
Given a GitHub repository snapshot (metadata, tree, README, key files), produce a clear architecture map and onboarding guide.

Return ONLY JSON:
{
  "summary": "3-5 sentence overview of what the project is",
  "architecture_overview": "paragraph on structure and data/control flow",
  "mermaid": "flowchart or C4-style Mermaid diagram ONLY (no fences), e.g. flowchart TB\\n  A-->B",
  "modules": [{"name":"…","path":"src/…","role":"…"}],
  "tech_stack": ["Next.js","…"],
  "how_to_run": ["step 1", "step 2"],
  "how_to_contribute": ["step 1"],
  "entrypoints": ["src/index.ts", "…"],
  "risks": ["complexity or missing docs risks"],
  "onboarding_checklist": ["read X", "run Y", "…"]
}

Rules:
- Mermaid must be valid and not too large (max ~25 nodes).
- Ground claims in the provided files; mark uncertainty briefly when guessing.
- Prefer concrete paths from the tree.`;

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(snapshotForPrompt(snap), null, 2),
      },
    ],
    temperature: 0.25,
    maxTokens: 4500,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;

  const modules = Array.isArray(raw.modules)
    ? raw.modules.map((m) => {
        const o = m as Record<string, unknown>;
        return {
          name: String(o.name ?? "module"),
          path: String(o.path ?? ""),
          role: String(o.role ?? ""),
        };
      })
    : [];

  let mermaid = String(raw.mermaid ?? "flowchart TB\n  Repo[Repository]");
  mermaid = mermaid
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const report: AtlasReport = {
    summary: String(raw.summary ?? "Repository analyzed."),
    architecture_overview: String(raw.architecture_overview ?? ""),
    mermaid,
    modules,
    tech_stack: Array.isArray(raw.tech_stack)
      ? raw.tech_stack.map(String)
      : [],
    how_to_run: Array.isArray(raw.how_to_run)
      ? raw.how_to_run.map(String)
      : [],
    how_to_contribute: Array.isArray(raw.how_to_contribute)
      ? raw.how_to_contribute.map(String)
      : [],
    entrypoints: Array.isArray(raw.entrypoints)
      ? raw.entrypoints.map(String)
      : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(String) : [],
    onboarding_checklist: Array.isArray(raw.onboarding_checklist)
      ? raw.onboarding_checklist.map(String)
      : [],
  };

  return {
    report,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export async function answerAtlasQuestion(opts: {
  snap: RepoSnapshot;
  report: AtlasReport;
  history: AtlasChatMessage[];
  question: string;
}): Promise<{
  message: AtlasChatMessage;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Atlas. Answer questions about this repository using the snapshot and architecture report.
Be specific with file paths when possible. If unknown, say so.
Return ONLY JSON: { "answer": "markdown-friendly text" }`;

  const historyText = opts.history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            report: opts.report,
            repo: opts.snap.meta,
            tree: {
              topLevel: opts.snap.tree.topLevel,
              importantPaths: opts.snap.tree.importantPaths.slice(0, 40),
            },
            keyFiles: opts.snap.keyFiles.map((f) => ({
              path: f.path,
              content: f.content.slice(0, 2500),
            })),
            conversation: historyText,
            question: opts.question,
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.2,
    maxTokens: 2500,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;
  return {
    message: {
      role: "assistant",
      content: String(raw.answer ?? "I could not answer that."),
      createdAt: new Date().toISOString(),
    },
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
