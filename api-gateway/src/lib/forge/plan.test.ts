import assert from "node:assert/strict";
import test from "node:test";
import { normalizeForgePlan } from "./plan.js";

test("bounds and normalizes Forge bug reproduction analysis", () => {
  const plan = normalizeForgePlan({
    summary: "Fix the failing request",
    approach: "Reproduce before changing code",
    issue_type: "BUG",
    missing_information: ["Runtime version"],
    reproduction: {
      prerequisites: ["Install dependencies"],
      steps: ["Start the app", "Submit the failing request"],
      expected_behavior: "The request succeeds",
      actual_behavior: "The request returns 500",
      minimal_reproduction: "POST /example with an empty body",
      confidence: "high",
    },
    likely_causes: Array.from({ length: 6 }, (_, index) => ({
      hypothesis: `Cause ${index}`,
      evidence: ["Issue body"],
      affected_paths: ["/src/handler.ts"],
      confidence: index === 0 ? "high" : "unknown",
    })),
    debugging_plan: Array.from({ length: 10 }, (_, index) => ({
      step: `Check ${index}`,
      goal: "Isolate the failure",
      signal: "The error disappears",
    })),
    files_to_touch: Array.from({ length: 8 }, (_, index) => ({
      path: `/src/file-${index}.ts`,
      action: index === 0 ? "invalid" : "modify",
      rationale: "Relevant code",
    })),
    complexity: "unexpected",
  });

  assert.equal(plan.issue_type, "bug");
  assert.equal(plan.reproduction?.confidence, "high");
  assert.equal(plan.likely_causes.length, 4);
  assert.equal(plan.debugging_plan.length, 8);
  assert.equal(plan.files_to_touch.length, 5);
  assert.equal(plan.files_to_touch[0]?.path, "src/file-0.ts");
  assert.equal(plan.files_to_touch[0]?.action, "modify");
  assert.equal(plan.complexity, "medium");
});

test("does not invent bug analysis for non-bug issues", () => {
  const plan = normalizeForgePlan({
    issue_type: "feature",
    reproduction: { steps: ["Should be discarded"] },
    likely_causes: [{ hypothesis: "Should be discarded" }],
    debugging_plan: [{ step: "Should be discarded" }],
  });

  assert.equal(plan.issue_type, "feature");
  assert.equal(plan.reproduction, null);
  assert.deepEqual(plan.likely_causes, []);
  assert.deepEqual(plan.debugging_plan, []);
});
