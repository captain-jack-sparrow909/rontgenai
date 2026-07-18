import { completeChat } from "../llm.js";
import type { RepoSnapshot } from "./github.js";

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
  diagrams: AtlasDiagram[];
  /** Primary diagram retained for older clients and saved reports. */
  mermaid: string;
  modules: { name: string; path: string; role: string }[];
  tech_stack: string[];
  how_to_run: string[];
  how_to_contribute: string[];
  entrypoints: string[];
  risks: string[];
  onboarding_checklist: string[];
};

export type AtlasMigrationRequest = {
  target: string;
  constraints?: string;
  deadline?: string;
};

export type AtlasMigrationDiagram = {
  stage: "current" | "target";
  title: string;
  description: string;
  mermaid: string;
  evidence: string[];
  confidence: "high" | "medium" | "low";
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
  diagrams: AtlasMigrationDiagram[];
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

const DIAGRAM_KINDS: AtlasDiagramKind[] = [
  "system",
  "data",
  "api",
  "dependencies",
];

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

function stringArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function cleanMermaid(value: unknown): string {
  return String(value ?? "")
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    // Do not allow model-provided Mermaid initialization directives to weaken
    // the strict renderer configuration used by the web application.
    .replace(/%%\{[\s\S]*?\}%%/g, "")
    .trim()
    .slice(0, 12_000);
}

function boundedString(value: unknown, fallback = "", limit = 2000): string {
  return String(value ?? fallback).trim().slice(0, limit);
}

function confidence(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "medium").toLowerCase();
  return normalized === "high" || normalized === "low" ? normalized : "medium";
}

export function normalizeAtlasMigrationAssessment(
  value: unknown,
  request: AtlasMigrationRequest,
): AtlasMigrationAssessment {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const current = (raw.current_state && typeof raw.current_state === "object"
    ? raw.current_state
    : {}) as Record<string, unknown>;
  const target = (raw.target_state && typeof raw.target_state === "object"
    ? raw.target_state
    : {}) as Record<string, unknown>;

  const diagrams = Array.isArray(raw.diagrams)
    ? raw.diagrams.slice(0, 2).map((item, index): AtlasMigrationDiagram => {
        const diagram = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const stage = diagram.stage === "target" ? "target" : index === 1 ? "target" : "current";
        return {
          stage,
          title: boundedString(diagram.title, `${stage} architecture`, 100),
          description: boundedString(diagram.description, "", 600),
          mermaid:
            cleanMermaid(diagram.mermaid) ||
            `flowchart LR\n  A[${stage === "current" ? "Current system" : "Target system"}]`,
          evidence: stringArray(diagram.evidence, 10),
          confidence: confidence(diagram.confidence),
        };
      })
    : [];

  const phases = Array.isArray(raw.phases)
    ? raw.phases.slice(0, 8).map((item, index) => {
        const phase = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const effortValue = String(phase.effort ?? "medium").toLowerCase();
        const riskValue = String(phase.risk ?? "medium").toLowerCase();
        return {
          name: boundedString(phase.name, `Phase ${index + 1}`, 100),
          objective: boundedString(phase.objective, "", 800),
          changes: stringArray(phase.changes, 12),
          dependencies: stringArray(phase.dependencies, 8),
          validation: stringArray(phase.validation, 10),
          rollback: boundedString(phase.rollback, "Revert this phase and restore the last validated release.", 800),
          effort: (["small", "large"].includes(effortValue) ? effortValue : "medium") as "small" | "medium" | "large",
          risk: (["low", "high"].includes(riskValue) ? riskValue : "medium") as "low" | "medium" | "high",
        };
      })
    : [];

  const compatibility = Array.isArray(raw.compatibility_bridges)
    ? raw.compatibility_bridges.slice(0, 10).map((item) => {
        const bridge = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          from: boundedString(bridge.from, "Current component", 200),
          to: boundedString(bridge.to, "Target component", 200),
          strategy: boundedString(bridge.strategy, "", 800),
          removal_gate: boundedString(bridge.removal_gate, "", 500),
        };
      })
    : [];

  const risks = Array.isArray(raw.risk_register)
    ? raw.risk_register.slice(0, 12).map((item) => {
        const risk = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          risk: boundedString(risk.risk, "Unspecified migration risk", 300),
          impact: boundedString(risk.impact, "", 500),
          mitigation: boundedString(risk.mitigation, "", 800),
          confidence: confidence(risk.confidence),
        };
      })
    : [];

  return {
    executive_summary: boundedString(raw.executive_summary, "Migration assessment generated.", 2500),
    current_state: {
      summary: boundedString(current.summary, "", 2000),
      strengths: stringArray(current.strengths, 12),
      constraints: stringArray(current.constraints, 12),
      blockers: stringArray(current.blockers, 12),
    },
    target_state: {
      target: boundedString(target.target, request.target, 500),
      architecture: boundedString(target.architecture, "", 2000),
      benefits: stringArray(target.benefits, 12),
      tradeoffs: stringArray(target.tradeoffs, 12),
    },
    diagrams,
    phases,
    compatibility_bridges: compatibility,
    testing_strategy: stringArray(raw.testing_strategy, 16),
    rollout_strategy: stringArray(raw.rollout_strategy, 16),
    risk_register: risks,
    assumptions: stringArray(raw.assumptions, 16),
  };
}

export function normalizeAtlasDiagrams(
  value: unknown,
  legacyMermaid: unknown,
): AtlasDiagram[] {
  const seen = new Set<AtlasDiagramKind>();
  const diagrams = Array.isArray(value)
    ? value
        .slice(0, 4)
        .map((item): AtlasDiagram | null => {
          const raw = item as Record<string, unknown>;
          const kindValue = String(raw.kind ?? "system").toLowerCase();
          const kind = DIAGRAM_KINDS.includes(kindValue as AtlasDiagramKind)
            ? (kindValue as AtlasDiagramKind)
            : "system";
          const mermaid = cleanMermaid(raw.mermaid);
          if (!mermaid || seen.has(kind)) return null;
          seen.add(kind);

          const confidenceValue = String(raw.confidence ?? "medium").toLowerCase();
          const confidence = ["high", "medium", "low"].includes(confidenceValue)
            ? (confidenceValue as AtlasDiagram["confidence"])
            : "medium";

          return {
            kind,
            title: String(raw.title ?? `${kind} view`).trim().slice(0, 100),
            description: String(raw.description ?? "").trim().slice(0, 600),
            mermaid,
            evidence: stringArray(raw.evidence, 10),
            confidence,
          };
        })
        .filter((diagram): diagram is AtlasDiagram => diagram !== null)
    : [];

  if (diagrams.length) {
    return diagrams.sort((a, b) =>
      a.kind === "system" ? -1 : b.kind === "system" ? 1 : 0,
    );
  }

  const mermaid = cleanMermaid(legacyMermaid) || "flowchart TB\n  Repo[Repository]";
  return [
    {
      kind: "system",
      title: "System architecture",
      description: "Primary repository architecture view.",
      mermaid,
      evidence: [],
      confidence: "medium",
    },
  ];
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
  "diagrams": [
    {
      "kind": "system|data|api|dependencies",
      "title": "short view title",
      "description": "what this view explains",
      "mermaid": "valid Mermaid source only, without fences",
      "evidence": ["paths or files supporting the view"],
      "confidence": "high|medium|low"
    }
  ],
  "modules": [{"name":"…","path":"src/…","role":"…"}],
  "tech_stack": ["Next.js","…"],
  "how_to_run": ["step 1", "step 2"],
  "how_to_contribute": ["step 1"],
  "entrypoints": ["src/index.ts", "…"],
  "risks": ["complexity or missing docs risks"],
  "onboarding_checklist": ["read X", "run Y", "…"]
}

Rules:
- Always include a system diagram. Include data, API, and dependency diagrams
  only when the repository contains evidence for those views (2-4 diagrams).
- Mermaid must be valid, use a supported diagram declaration, and stay between
  roughly 8 and 25 nodes per view. Do not use fences or init directives.
- Evidence must use concrete paths from the supplied tree/key files.
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
    maxTokens: 6500,
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

  const diagrams = normalizeAtlasDiagrams(raw.diagrams, raw.mermaid);

  const report: AtlasReport = {
    summary: String(raw.summary ?? "Repository analyzed."),
    architecture_overview: String(raw.architecture_overview ?? ""),
    diagrams,
    mermaid: diagrams[0].mermaid,
    modules,
    tech_stack: stringArray(raw.tech_stack),
    how_to_run: stringArray(raw.how_to_run),
    how_to_contribute: stringArray(raw.how_to_contribute),
    entrypoints: stringArray(raw.entrypoints),
    risks: stringArray(raw.risks),
    onboarding_checklist: stringArray(raw.onboarding_checklist),
  };

  return {
    report,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export async function generateAtlasMigrationAssessment(
  snap: RepoSnapshot,
  request: AtlasMigrationRequest,
): Promise<{
  migration: AtlasMigrationAssessment;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Atlas, a staff-level software migration architect at Röntgen AI.
Analyze the supplied repository evidence and create a staged, reversible migration assessment toward the requested target.

Return ONLY JSON:
{
  "executive_summary": "decision-oriented summary",
  "current_state": {"summary":"…","strengths":["…"],"constraints":["…"],"blockers":["…"]},
  "target_state": {"target":"…","architecture":"…","benefits":["…"],"tradeoffs":["…"]},
  "diagrams": [{"stage":"current|target","title":"…","description":"…","mermaid":"valid Mermaid without fences","evidence":["paths"],"confidence":"high|medium|low"}],
  "phases": [{"name":"…","objective":"…","changes":["…"],"dependencies":["…"],"validation":["…"],"rollback":"…","effort":"small|medium|large","risk":"low|medium|high"}],
  "compatibility_bridges": [{"from":"…","to":"…","strategy":"…","removal_gate":"…"}],
  "testing_strategy": ["…"],
  "rollout_strategy": ["…"],
  "risk_register": [{"risk":"…","impact":"…","mitigation":"…","confidence":"high|medium|low"}],
  "assumptions": ["…"]
}

Rules:
- Ground current-state claims in concrete repository paths. Treat missing evidence as an assumption.
- Prefer incremental replacement, compatibility bridges, measurable gates, and a rollback for every phase.
- Provide 3-7 phases ordered by dependency, not calendar promises. Effort is relative sizing only.
- Include current and target Mermaid diagrams with 8-25 nodes when evidence permits.
- Never invent benchmark numbers, deadlines, team capacity, or cloud costs.
- Respect the user's constraints and deadline as planning inputs, not guarantees.`;

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          { request, repository: snapshotForPrompt(snap) },
          null,
          2,
        ),
      },
    ],
    temperature: 0.2,
    maxTokens: 7000,
    jsonMode: true,
  });

  return {
    migration: normalizeAtlasMigrationAssessment(extractJson(result.content), request),
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
