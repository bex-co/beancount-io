import { ConflictError } from "@/shared/errors";

/**
 * A whole-file write or a delete from an old read would drop whatever landed
 * since; the caller's `sha` names the version it read (w23/039). Its own hint,
 * because the CONFLICT category's names an entry-hash lookup that cannot
 * satisfy a file version check (w23/147).
 */
export function staleFileConflict(path: string): ConflictError {
  return new ConflictError(
    "File",
    `${path} changed since you read it; re-read it and retry`,
    {
      hint: "Re-read the file's current `sha` (MCP `readLedgerFiles`, or REST `GET` on the file) and retry with that `sha`.",
    },
  );
}
