import test from "node:test";
import assert from "node:assert/strict";
import { FixedWindowMemoryLimiter } from "./rate-limit.js";

test("fixed-window limiter blocks above the limit and resets", () => {
  const limiter = new FixedWindowMemoryLimiter();
  assert.equal(limiter.consume("user", 2, 1000, 100).allowed, true);
  assert.equal(limiter.consume("user", 2, 1000, 200).remaining, 0);
  assert.equal(limiter.consume("user", 2, 1000, 300).allowed, false);
  const reset = limiter.consume("user", 2, 1000, 1200);
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 1);
});
