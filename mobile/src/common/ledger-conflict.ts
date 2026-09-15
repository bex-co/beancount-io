/**
 * Whether a save was rejected because the ledger moved underneath it: the
 * checksum (`sha`) it was made against no longer matches, or the server reports
 * a conflict. Shared by both editors that save against an optimistic lock.
 */
export function isConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("sha") || m.includes("conflict") || m.includes("409");
}
