import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRelayReport } from "./analyze.js";

test("normalizes evidence-backed Relay findings", () => {
  const report = normalizeRelayReport({
    pipeline_score: 120,
    findings: [{ category: "cache_miss", estimated_savings_percent: 18.25, confidence: "high", evidence: ["npm cache restored false"] }],
    workflow_graph_mermaid: "```mermaid\n%%{init: {'securityLevel':'loose'}}%%\nflowchart LR\n A --> B\n```",
  });
  assert.equal(report.pipeline_score, 100);
  assert.equal(report.findings[0]?.estimated_savings_percent, 18.3);
  assert.doesNotMatch(report.workflow_graph_mermaid, /```|%%\{init/i);
});

test("rejects unsupported Relay estimates and categories", () => {
  const report = normalizeRelayReport({ findings: [{ category: "magic", estimated_savings_percent: 900, confidence: "certain" }] });
  assert.equal(report.findings[0]?.category, "other");
  assert.equal(report.findings[0]?.estimated_savings_percent, null);
  assert.equal(report.findings[0]?.confidence, "medium");
});
