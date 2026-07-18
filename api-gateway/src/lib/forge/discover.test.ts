import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueDiscoveryQuery } from "./discover.js";

test("builds a bounded open-issue discovery query", () => {
  const query = buildIssueDiscoveryQuery({
    query: "parser bug\n is:pr",
    language: "TypeScript",
    organization: "openai",
    labels: ["help wanted"],
    beginnerFriendly: true,
    unassignedOnly: true,
  });

  assert.match(query, /^is:issue is:open archived:false/);
  assert.match(query, /language:"TypeScript"/);
  assert.match(query, /org:"openai"/);
  assert.match(query, /label:"good first issue"/);
  assert.match(query, /no:assignee/);
  assert.doesNotMatch(query, /\n/);
});

test("allows broader searches when beginner and assignment filters are off", () => {
  const query = buildIssueDiscoveryQuery({
    beginnerFriendly: false,
    unassignedOnly: false,
  });
  assert.equal(query, "is:issue is:open archived:false");
});
