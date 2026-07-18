import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRadarReport } from "./investigate.js";

test("normalizes operational correlations and reversible remediation advice", () => {
  const report = normalizeRadarReport({
    incident_summary: "Errors followed a deployment.",
    severity: "high",
    likely_causes: [
      { title: "Bad rollout", confidence: 4, category: "deploy" },
    ],
    operational_correlations: [
      {
        signal: "5xx alert",
        related_change: "release 42",
        evidence: ["Alert started two minutes after deployment"],
        confidence: "high",
      },
    ],
    safe_remediations: [
      {
        action: "Roll back release 42",
        validation: "Confirm 5xx returns to baseline",
        rollback: "Redeploy after fixing the regression",
        risk: "high",
      },
    ],
    approval_required: ["Production rollback"],
  });

  assert.equal(report.likely_causes[0]?.confidence, 1);
  assert.equal(report.operational_correlations[0]?.confidence, "high");
  assert.equal(report.safe_remediations[0]?.risk, "high");
  assert.deepEqual(report.approval_required, ["Production rollback"]);
});

test("falls back safely for malformed Radar fields", () => {
  const report = normalizeRadarReport({
    severity: "catastrophic",
    likely_causes: [{ confidence: "unknown", category: "magic" }],
    safe_remediations: [{ risk: "certain" }],
  });
  assert.equal(report.severity, "medium");
  assert.equal(report.likely_causes[0]?.confidence, 0.5);
  assert.equal(report.likely_causes[0]?.category, "unknown");
  assert.equal(report.safe_remediations[0]?.risk, "medium");
});
