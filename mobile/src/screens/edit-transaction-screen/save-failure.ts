import { isConflictError } from "../../common/ledger-conflict";

export type SaveFailure =
  { kind: "conflict" } | { kind: "rejected"; message: string | null };

/**
 * What Edit Transaction reports when a save is rejected. A stale checksum can
 * never succeed as it is, so it gets the reload-and-retry message; anything
 * else (invalid beancount, most often) keeps the server's own explanation,
 * which is the useful part there.
 */
export function selectSaveFailure(
  message: string | null | undefined,
): SaveFailure {
  return message && isConflictError(message)
    ? { kind: "conflict" }
    : { kind: "rejected", message: message ?? null };
}
