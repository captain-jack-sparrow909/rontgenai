import test from "node:test";
import assert from "node:assert/strict";
import { hasValidKeepaliveAuthorization } from "./keepalive.js";

const secret = "a-secure-keepalive-secret-with-32-chars";

test("accepts the configured keepalive bearer secret", () => {
  assert.equal(
    hasValidKeepaliveAuthorization(`Bearer ${secret}`, secret),
    true,
  );
});

test("rejects missing, malformed, or incorrect keepalive credentials", () => {
  assert.equal(hasValidKeepaliveAuthorization(undefined, secret), false);
  assert.equal(hasValidKeepaliveAuthorization(`Basic ${secret}`, secret), false);
  assert.equal(hasValidKeepaliveAuthorization("Bearer wrong", secret), false);
  assert.equal(hasValidKeepaliveAuthorization(`Bearer ${secret} extra`, secret), false);
  assert.equal(hasValidKeepaliveAuthorization(`Bearer ${secret}`, undefined), false);
});
