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

export async function runRadarInvestigation(opts: {
  title?: string;
  description?: string;
  metricsNotes?: string;
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
}

Rules:
- 2-5 likely_causes, rank starting at 1.
- confidence is 0-1.
- If logs are thin, say so and lower confidence.
- investigation_checklist should be runnable by an on-call engineer.`;

  const payload = {
    title: opts.title ?? null,
    description: opts.description ?? null,
    metricsNotes: opts.metricsNotes ?? null,
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

  const raw = extractJson(result.content) as Record<string, unknown>;
  const causesRaw = Array.isArray(raw.likely_causes) ? raw.likely_causes : [];
  const post = (raw.postmortem_draft ?? {}) as Record<string, unknown>;

  const likely_causes: RadarCause[] = causesRaw.slice(0, 6).map((c, i) => {
    const o = c as Record<string, unknown>;
    const cat = String(o.category ?? "unknown");
    let confidence = Number(o.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    return {
      rank: typeof o.rank === "number" ? o.rank : i + 1,
      title: String(o.title ?? "Unknown cause"),
      confidence,
      evidence: Array.isArray(o.evidence) ? o.evidence.map(String) : [],
      category: (
        [
          "dependency",
          "resource",
          "deploy",
          "config",
          "code",
          "traffic",
          "unknown",
        ].includes(cat)
          ? cat
          : "unknown"
      ) as RadarCause["category"],
      remediation: Array.isArray(o.remediation)
        ? o.remediation.map(String)
        : [],
    };
  });

  const severity = String(raw.severity ?? "medium");
  const report: RadarReport = {
    incident_summary: String(raw.incident_summary ?? "Investigation complete."),
    severity: (
      ["critical", "high", "medium", "low"].includes(severity)
        ? severity
        : "medium"
    ) as RadarReport["severity"],
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((t) => {
          const o = t as Record<string, unknown>;
          return {
            time: o.time != null ? String(o.time) : null,
            event: String(o.event ?? ""),
          };
        })
      : [],
    likely_causes,
    blast_radius: String(raw.blast_radius ?? "Unknown"),
    immediate_actions: Array.isArray(raw.immediate_actions)
      ? raw.immediate_actions.map(String)
      : [],
    investigation_checklist: Array.isArray(raw.investigation_checklist)
      ? raw.investigation_checklist.map(String)
      : [],
    postmortem_draft: {
      impact: String(post.impact ?? ""),
      detection: String(post.detection ?? ""),
      root_cause: String(post.root_cause ?? ""),
      resolution: String(post.resolution ?? ""),
      lessons: Array.isArray(post.lessons) ? post.lessons.map(String) : [],
    },
    related_signals: Array.isArray(raw.related_signals)
      ? raw.related_signals.map(String)
      : [],
  };

  return {
    report,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
