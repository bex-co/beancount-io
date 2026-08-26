import { createHash, timingSafeEqual } from "node:crypto";

/** Compare secrets in constant time even when their input lengths differ. */
export function secureStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
