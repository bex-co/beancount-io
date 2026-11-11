import { CombinedGraphQLErrors } from "@apollo/client/errors";

/**
 * The server refused a save made against a revision another write has since
 * replaced (`updateLedgerFile` answers a stale `sha` with `CONFLICT`). The
 * editor keeps the draft and offers a way forward instead of a toast whose
 * advice to refresh would discard it (w2/110).
 */
export function isSaveConflict(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "CONFLICT")
  );
}
