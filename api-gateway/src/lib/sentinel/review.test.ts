import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSentinelReview } from "./review.js";

test("normalizes bounded security findings and enforces critical verdicts", () => {
  const review = normalizeSentinelReview({
    summary: "Authorization regression.",
    verdict: "approve",
    findings: [
      {
        severity: "critical",
        path: "src/auth.ts",
        line: "12",
        title: "Missing authorization",
        body: "A caller can cross the tenant boundary.",
        cwe: "CWE-862",
        category: "access-control",
        exploitability: "high",
        attack_scenario: "An authenticated user requests another tenant ID.",
        evidence: ["The handler trusts tenantId from the request."],
        confidence: "high",
      },
    ],
    security_posture: {
      attack_surface: ["HTTP handler"],
      trust_boundaries: ["Request to tenant service"],
      sensitive_assets: ["Tenant records"],
      residual_risks: ["Caller middleware was not included in the diff"],
    },
  });

  assert.equal(review.verdict, "request_changes");
  assert.equal(review.findings[0]?.line, 12);
  assert.equal(review.findings[0]?.cwe, "CWE-862");
  assert.equal(review.findings[0]?.exploitability, "high");
  assert.deepEqual(review.security_posture?.sensitive_assets, ["Tenant records"]);
});

test("downgrades invalid Sentinel model fields safely", () => {
  const review = normalizeSentinelReview({
    verdict: "ship-it",
    findings: [{ severity: "blocker", exploitability: "certain", confidence: "certain" }],
  });
  assert.equal(review.verdict, "comment");
  assert.equal(review.findings[0]?.severity, "info");
  assert.equal(review.findings[0]?.exploitability, null);
  assert.equal(review.findings[0]?.confidence, "medium");
});
