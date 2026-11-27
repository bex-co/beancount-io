import { ConflictError } from "@/shared/errors";

/**
 * What a rename is told when it loses a race. Neither rename takes a file
 * `sha` or an entry `sha256sum`, so the hints a lost race otherwise maps to
 * (the file write's, w23/178, or the category's, about entries) name an
 * argument the caller cannot send (w31/130).
 */
const RENAME_WRITE_RACE_HINT =
  "Another write changed a file this rename touches after the rename read it, so nothing was renamed. Send the same call again: it re-reads the files and renames on their current content.";

/**
 * Commit a rename, answering a lost race in the rename's own terms.
 *
 * `renameAccount` and `renameLedgerFile` read the files they touch, then
 * commit against the blob shas they read, so a write that lands in between
 * refuses the whole rename (the w1/m43 contract chose `CONFLICT` for this).
 * The ledger words that refusal as a stale file `sha`, or not at all. A path
 * that already exists is a `File` conflict and keeps its own message and hint.
 */
export async function commitRename<T>(commit: () => Promise<T>): Promise<T> {
  try {
    return await commit();
  } catch (error) {
    if (
      !(error instanceof ConflictError) ||
      error.metadata?.resource === "File"
    )
      throw error;
    throw new ConflictError(
      "Ledger",
      "another write changed a file this rename touches after the rename read it; nothing was renamed",
      { hint: RENAME_WRITE_RACE_HINT },
    );
  }
}
