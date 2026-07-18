import { completeChat } from "../llm.js";
import type { LogSignalSummary } from "./parse.js";

export type RadarCause = {
  rank: number;
  title: string;
  confidence: number;
  evidence: string[];
  category:
    | "dependency"
    | "resource"
    | "deploy"
    | "config"
    | "code"
    | "traffic"
    | "unknown";
  remediation: string[];
};

export type RadarOperationsContext = {
  deployment?: string;
  infrastructureChanges?: string;
  alerts?: string;
  serviceTopology?: string;
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

function stringArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function boundedString(value: unknown, fallback = "", limit = 2500): string {
  return String(value ?? fallback).trim().slice(0, limit);
}

function confidenceLabel(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "medium").toLowerCase();
  return normalized === "high" || normalized === "low" ? normalized : "medium";
}

export function normalizeRadarReport(value: unknown): RadarReport {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const causesRaw = Array.isArray(raw.likely_causes) ? raw.likely_causes : [];
  const post = (raw.postmortem_draft && typeof raw.postmortem_draft === "object"
    ? raw.postmortem_draft
    : {}) as Record<string, unknown>;
  const likely_causes: RadarCause[] = causesRaw.slice(0, 6).map((cause, index) => {
    const item = (cause && typeof cause === "object" ? cause : {}) as Record<string, unknown>;
    const category = String(item.category ?? "unknown");
    let confidence = Number(item.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    return {
      rank: typeof item.rank === "number" ? item.rank : index + 1,
      title: boundedString(item.title, "Unknown cause", 200),
      confidence: Math.max(0, Math.min(1, confidence)),
      evidence: stringArray(item.evidence, 12),
      category: (["dependency", "resource", "deploy", "config", "code", "traffic", "unknown"].includes(category) ? category : "unknown") as RadarCause["category"],
      remediation: stringArray(item.remediation, 12),
    };
  });
  const severity = String(raw.severity ?? "medium");
  const correlations = Array.isArray(raw.operational_correlations)
    ? raw.operational_correlations.slice(0, 10).map((correlation) => {
        const item = (correlation && typeof correlation === "object" ? correlation : {}) as Record<string, unknown>;
        return {
          signal: boundedString(item.signal, "Observed signal", 600),
          related_change: boundedString(item.related_change, "Unknown change", 600),
          evidence: stringArray(item.evidence, 10),
          confidence: confidenceLabel(item.confidence),
        };
      })
    : [];
  const remediations = Array.isArray(raw.safe_remediations)
    ? raw.safe_remediations.slice(0, 10).map((remediation) => {
        const item = (remediation && typeof remediation === "object" ? remediation : {}) as Record<string, unknown>;
        const risk = String(item.risk ?? "medium").toLowerCase();
        return {
          action: boundedString(item.action, "Investigate further", 800),
          rationale: boundedString(item.rationale, "", 1000),
          validation: boundedString(item.validation, "", 800),
          rollback: boundedString(item.rollback, "", 800),
          risk: (["low", "high"].includes(risk) ? risk : "medium") as "low" | "medium" | "high",
        };
      })
    : [];

  return {
    incident_summary: boundedString(raw.incident_summary, "Investigation complete.", 3000),
    severity: (["critical", "high", "medium", "low"].includes(severity) ? severity : "medium") as RadarReport["severity"],
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.slice(0, 30).map((entry) => {
          const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
          return { time: item.time != null ? boundedString(item.time, "", 120) : null, event: boundedString(item.event, "", 1000) };
        })
      : [],
    likely_causes,
    blast_radius: boundedString(raw.blast_radius, "Unknown", 2000),
    immediate_actions: stringArray(raw.immediate_actions, 16),
    investigation_checklist: stringArray(raw.investigation_checklist, 20),
    postmortem_draft: {
      impact: boundedString(post.impact),
      detection: boundedString(post.detection),
      root_cause: boundedString(post.root_cause),
      resolution: boundedString(post.resolution),
      lessons: stringArray(post.lessons, 16),
    },
    related_signals: stringArray(raw.related_signals, 20),
    operational_correlations: correlations,
    safe_remediations: remediations,
    approval_required: stringArray(raw.approval_required, 16),
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

export async function runRadarInvestigation(opts: {
  title?: string;
  description?: string;
  metricsNotes?: string;
  operationsContext?: RadarOperationsContext;
  summary: LogSignalSummary;
}): Promise<{
  report: RadarReport;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Radar, a principal SRE incident investigator at Röntgen AI.
Given structured log signals (and optional user context / metrics notes), produce a root-cause analysis.
Be concrete. Rank causes by likelihood. Prefer evidence from the logs.

Return ONLY JSON:
{
  "incident_summary": "2-4 sentences",
  "severity": "critical|high|medium|low",
  "timeline": [{"time": "ts or null", "event": "what happened"}],
  "likely_causes": [
    {
      "rank": 1,
      "title": "short cause title",
      "confidence": 0.0-1.0,
      "evidence": ["log-backed evidence"],
      "category": "dependency|resource|deploy|config|code|traffic|unknown",
      "remediation": ["action 1"]
    }
  ],
  "blast_radius": "who/what is affected",
  "immediate_actions": ["do now"],
  "investigation_checklist": ["check X", "verify Y"],
  "postmortem_draft": {
    "impact": "…",
    "detection": "…",
    "root_cause": "…",
    "resolution": "…",
    "lessons": ["…"]
  },
  "related_signals": ["patterns noticed"]
  ,"operational_correlations": [{"signal":"observed alert/log/metric","related_change":"deployment or infrastructure change","evidence":["why they may be related"],"confidence":"high|medium|low"}]
  ,"safe_remediations": [{"action":"advisory action","rationale":"why","validation":"how to verify","rollback":"how to reverse","risk":"low|medium|high"}]
  ,"approval_required": ["actions that must receive human approval before execution"]
}

Rules:
- 2-5 likely_causes, rank starting at 1.
- confidence is 0-1.
- If logs are thin, say so and lower confidence.
- Correlate deployments, infrastructure changes, alerts, metrics, and logs by time/evidence; correlation is not proof of causation.
- Remediations are advisory only. Include validation and rollback, and put restarts, rollbacks, scaling, traffic changes, data changes, and infrastructure mutations in approval_required.
- Never claim an action was executed.
- investigation_checklist should be runnable by an on-call engineer.`;

  const payload = {
    title: opts.title ?? null,
    description: opts.description ?? null,
    metricsNotes: opts.metricsNotes ?? null,
    operationsContext: opts.operationsContext ?? null,
    signals: {
      totalLines: opts.summary.totalLines,
      errorCount: opts.summary.errorCount,
      warnCount: opts.summary.warnCount,
      levels: opts.summary.levels,
      topServices: opts.summary.topServices,
      topErrorSignatures: opts.summary.topErrorSignatures,
      timeRange: opts.summary.timeRange,
      sampleErrors: opts.summary.sampleErrors.slice(0, 25).map((l) => ({
        timestamp: l.timestamp,
        service: l.service,
        message: l.message,
        attrs: l.attrs,
      })),
      sampleLines: opts.summary.sampleLines.slice(0, 20).map((l) => l.raw),
    },
  };

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload, null, 2) },
    ],
    temperature: 0.2,
    maxTokens: 4500,
    jsonMode: true,
  });

  const report = normalizeRadarReport(extractJson(result.content));

  return {
    report,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
