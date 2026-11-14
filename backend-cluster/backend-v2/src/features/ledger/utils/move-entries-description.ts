/**
 * The entry move, as REST, GraphQL and MCP describe it (w1/m45); each adds
 * its own spelling of the preview flag and the undo.
 */
export const MOVE_ENTRIES_DESCRIPTION =
  "Move entries into another ledger file in one commit: each entry's source text leaves its file byte for byte and is appended to toPath in ledger order. listLedgerEntries with include_source returns each entry's hash and sha256sum. Refused, writing nothing: a toPath the ledger does not load unless includeFrom is given, a stale sha256sum (CONFLICT), an entry already in toPath, and a move that adds a bean-check error (VALIDATION_FAILED, unless allowInvalid).";

/** What `toPath` and `includeFrom` mean, shared by every surface's input. */
export const MOVE_TO_PATH_DESCRIPTION =
  "Repository path of the .bean or .beancount file the entries move into; created when absent.";
export const MOVE_INCLUDE_FROM_DESCRIPTION =
  'A file the ledger loads that gains include "<toPath>" (relative to it) when toPath is not loaded yet. Without it, an unloaded toPath is refused.';
