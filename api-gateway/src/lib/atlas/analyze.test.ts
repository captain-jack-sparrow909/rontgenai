import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAtlasDiagrams,
  normalizeAtlasMigrationAssessment,
} from "./analyze.js";

test("normalizes, bounds, and orders Atlas diagram views", () => {
  const diagrams = normalizeAtlasDiagrams(
    [
      {
        kind: "dependencies",
        title: "Dependencies",
        mermaid: "flowchart LR\n  App --> SDK",
        evidence: ["package.json"],
        confidence: "high",
      },
      {
        kind: "system",
        title: "System",
        mermaid:
          "```mermaid\n%%{init: {'securityLevel':'loose'}}%%\nflowchart TB\n  Web --> API\n```",
        evidence: ["src/index.ts"],
        confidence: "unexpected",
      },
      {
        kind: "system",
        title: "Duplicate",
        mermaid: "flowchart TB\n  A --> B",
      },
    ],
    null,
  );

  assert.equal(diagrams.length, 2);
  assert.equal(diagrams[0]?.kind, "system");
  assert.equal(diagrams[0]?.confidence, "medium");
  assert.doesNotMatch(diagrams[0]?.mermaid ?? "", /%%\{init/i);
  assert.doesNotMatch(diagrams[0]?.mermaid ?? "", /```/);
  assert.equal(diagrams[1]?.kind, "dependencies");
});

test("keeps legacy Atlas maps readable", () => {
  const diagrams = normalizeAtlasDiagrams(
    undefined,
    "flowchart TB\n  Repo --> API",
  );

  assert.deepEqual(diagrams.map((diagram) => diagram.kind), ["system"]);
  assert.match(diagrams[0]?.mermaid ?? "", /Repo --> API/);
});

test("normalizes a bounded, reversible Atlas migration assessment", () => {
  const assessment = normalizeAtlasMigrationAssessment(
    {
      executive_summary: "Move incrementally.",
      target_state: { architecture: "A modular target." },
      diagrams: [
        {
          stage: "target",
          title: "Target",
          mermaid: "```mermaid\n%%{init: {'securityLevel':'loose'}}%%\nflowchart LR\n A --> B\n```",
          confidence: "certain",
        },
      ],
      phases: [
        {
          name: "Bridge",
          changes: ["Add adapter"],
          rollback: "Disable adapter",
          effort: "huge",
          risk: "high",
        },
      ],
      risk_register: [{ risk: "Data drift", confidence: "low" }],
    },
    { target: "Next.js 16", constraints: "No downtime" },
  );

  assert.equal(assessment.target_state.target, "Next.js 16");
  assert.equal(assessment.phases[0]?.effort, "medium");
  assert.equal(assessment.phases[0]?.risk, "high");
  assert.equal(assessment.risk_register[0]?.confidence, "low");
  assert.doesNotMatch(assessment.diagrams[0]?.mermaid ?? "", /%%\{init|```/i);
});
