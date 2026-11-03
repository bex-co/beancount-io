/**
 * Client request ids and the fingerprints that pair them with a request:
 * ledger creation (w21/434) and retry-safe entry writes (w3/m61) both send one
 * id per request and keep it only while the request stays the same.
 */

/** A fresh request id: time plus randomness, no platform crypto needed. */
export function newRequestId(prefix = "req"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * FNV-1a (32-bit) of a value's JSON. Not a secret and not a security hash: it
 * only has to tell two requests apart.
 */
export function fnv1a32(value: unknown): number {
  const text = JSON.stringify(value) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}
