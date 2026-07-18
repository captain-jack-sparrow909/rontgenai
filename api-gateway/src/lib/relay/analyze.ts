import { completeChat } from "../llm.js";

export type RelayFindingCategory =
  | "cache_miss"
  | "flaky_test"
  | "duplicated_work"
  | "serialization"
  | "runner"
  | "setup"
  | "artifact"
  | "other";

export type RelayReport = {
  summary: string;
  pipeline_score: number;
  observed_duration: string | null;
  critical_path: string[];
  findings: {
    category: RelayFindingCategory;
    title: string;
    evidence: string[];
    impact: string;
    recommendation: string;
    validation: string;
    confidence: "high" | "medium" | "low";
    estimated_savings_percent: number | null;
  }[];
  flaky_tests: {
    test: string;
    evidence: string[];
    suspected_cause: string;
    next_step: string;
    confidence: "high" | "medium" | "low";
  }[];
  cache_analysis: {
    current_state: string;
    misses: string[];
    recommendations: string[];
  };
  duplicated_work: string[];
  workflow_graph_mermaid: string;
  prioritized_actions: string[];
  assumptions: string[];
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

function strings(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];
}

function bounded(value: unknown, fallback = "", limit = 2000): string {
  return String(value ?? fallback).trim().slice(0, limit);
}

function confidence(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "medium").toLowerCase();
  return normalized === "high" || normalized === "low" ? normalized : "medium";
}

function cleanMermaid(value: unknown): string {
  return bounded(value, "flowchart LR\n  Trigger --> Build --> Test", 12_000)
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(/%%\{[\s\S]*?\}%%/g, "")
    .trim();
}

export function normalizeRelayReport(value: unknown): RelayReport {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const score = Number(raw.pipeline_score);
  const cache = (raw.cache_analysis && typeof raw.cache_analysis === "object"
    ? raw.cache_analysis
    : {}) as Record<string, unknown>;
  const findings = Array.isArray(raw.findings)
    ? raw.findings.slice(0, 20).map((finding) => {
        const item = (finding && typeof finding === "object" ? finding : {}) as Record<string, unknown>;
        const category = String(item.category ?? "other").toLowerCase();
        const savings = Number(item.estimated_savings_percent);
        return {
          category: (["cache_miss", "flaky_test", "duplicated_work", "serialization", "runner", "setup", "artifact"].includes(category) ? category : "other") as RelayFindingCategory,
          title: bounded(item.title, "Pipeline opportunity", 200),
          evidence: strings(item.evidence, 12),
          impact: bounded(item.impact, "", 1000),
          recommendation: bounded(item.recommendation, "", 1600),
          validation: bounded(item.validation, "Measure several representative runs before and after the change.", 1200),
          confidence: confidence(item.confidence),
          estimated_savings_percent:
            Number.isFinite(savings) && savings >= 0 && savings <= 100
              ? Math.round(savings * 10) / 10
              : null,
        };
      })
    : [];
  const flakyTests = Array.isArray(raw.flaky_tests)
    ? raw.flaky_tests.slice(0, 20).map((test) => {
        const item = (test && typeof test === "object" ? test : {}) as Record<string, unknown>;
        return {
          test: bounded(item.test, "Unknown test", 400),
          evidence: strings(item.evidence, 10),
          suspected_cause: bounded(item.suspected_cause, "Insufficient evidence", 1000),
          next_step: bounded(item.next_step, "Collect more retry and failure history.", 1000),
          confidence: confidence(item.confidence),
        };
      })
    : [];

  return {
    summary: bounded(raw.summary, "Pipeline analysis completed.", 3000),
    pipeline_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
    observed_duration: raw.observed_duration ? bounded(raw.observed_duration, "", 120) : null,
    critical_path: strings(raw.critical_path, 30),
    findings,
    flaky_tests: flakyTests,
    cache_analysis: {
      current_state: bounded(cache.current_state, "No cache evidence supplied.", 1600),
      misses: strings(cache.misses, 20),
      recommendations: strings(cache.recommendations, 20),
    },
    duplicated_work: strings(raw.duplicated_work, 20),
    workflow_graph_mermaid: cleanMermaid(raw.workflow_graph_mermaid),
    prioritized_actions: strings(raw.prioritized_actions, 20),
    assumptions: strings(raw.assumptions, 20),
  };
}

export async function runRelayAnalysis(input: {
  title?: string;
  repository?: string;
  notes?: string;
  pipelineData: string;
}): Promise<{ report: RelayReport; model: string; promptTokens: number; completionTokens: number }> {
  const system = `You are Relay, a staff CI/CD performance engineer at Röntgen AI.
Analyze the supplied workflow/run/job/step/test/cache evidence and recommend faster, more reliable pipelines.

Return ONLY JSON:
{
  "summary":"…", "pipeline_score":0-100, "observed_duration":"… or null",
  "critical_path":["job / step"],
  "findings":[{"category":"cache_miss|flaky_test|duplicated_work|serialization|runner|setup|artifact|other","title":"…","evidence":["…"],"impact":"…","recommendation":"…","validation":"…","confidence":"high|medium|low","estimated_savings_percent":null}],
  "flaky_tests":[{"test":"…","evidence":["…"],"suspected_cause":"…","next_step":"…","confidence":"high|medium|low"}],
  "cache_analysis":{"current_state":"…","misses":["…"],"recommendations":["…"]},
  "duplicated_work":["…"], "workflow_graph_mermaid":"flowchart source without fences",
  "prioritized_actions":["…"], "assumptions":["…"]
}

Rules:
- Every finding must cite supplied evidence. Missing telemetry becomes an assumption or instrumentation recommendation.
- Never invent duration, cache-hit rate, flaky-test frequency, or savings. Use null savings unless supported by multiple runs or explicit timings.
- Distinguish a repeatedly failing test from a flaky test that passes on retry or varies across comparable runs.
- Preserve correctness and security; recommend measurement before broad runner/cache changes.
- Produce a concise 5-30 node Mermaid workflow graph with no init directives.`;

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            title: input.title ?? null,
            repository: input.repository ?? null,
            notes: input.notes?.slice(0, 5000) ?? null,
            pipelineData: input.pipelineData.slice(0, 180_000),
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.15,
    maxTokens: 6500,
    jsonMode: true,
  });
  return {
    report: normalizeRelayReport(extractJson(result.content)),
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
