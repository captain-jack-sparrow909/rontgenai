import { timingSafeEqual } from "node:crypto";

export function hasValidKeepaliveAuthorization(
  authorization: string | undefined,
  expectedSecret: string | undefined,
): boolean {
  if (!authorization || !expectedSecret) return false;

  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return false;

  const supplied = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
