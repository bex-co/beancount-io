import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compare secrets without leaking their shared-prefix length through an early
 * return. Hashing first gives timingSafeEqual fixed-size inputs even when an
 * attacker supplies a value with the wrong length.
 */
export function secureStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
