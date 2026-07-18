import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBlueprintResult } from "./review.js";

test("normalizes evidence-backed cloud cost opportunities", () => {
  const result = normalizeBlueprintResult({
    scores: { cost_efficiency: 7 },
    cost_analysis: {
      baseline: "$10,000 USD monthly export",
      currency: "USD",
      opportunities: [
        {
          resource: "db-prod-replica",
          category: "rightsizing",
          evidence: ["CPU remained below 10% in supplied sample"],
          monthly_savings_low: "120.25",
          monthly_savings_high: 240,
          confidence: "high",
          effort: "small",
          risk: "medium",
        },
      ],
      total_monthly_savings_low: 120.25,
      total_monthly_savings_high: 240,
    },
  });
  assert.equal(result.cost_analysis?.opportunities[0]?.category, "rightsizing");
  assert.equal(result.cost_analysis?.opportunities[0]?.monthly_savings_low, 120.25);
  assert.equal(result.cost_analysis?.currency, "USD");
});

test("does not manufacture invalid savings estimates", () => {
  const result = normalizeBlueprintResult({
    cost_analysis: {
      opportunities: [{ monthly_savings_low: "unknown", monthly_savings_high: -1 }],
    },
  });
  assert.equal(result.cost_analysis?.opportunities[0]?.monthly_savings_low, null);
  assert.equal(result.cost_analysis?.opportunities[0]?.monthly_savings_high, null);
});
