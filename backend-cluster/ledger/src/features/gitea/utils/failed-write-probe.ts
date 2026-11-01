import { giteaErrorMessage, giteaErrorStatus } from "./gitea-error";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "failed-write-probe" });

/** One file operation of a commit that failed, with what it meant to write. */
export interface ProbedOperation {
  operation: "create" | "update" | "delete";
  path: string;
  /** The blob sha the operation was based on (update and delete). */
  sha?: string;
  /** Base64 content the operation would write (create and update). */
  contentBase64?: string;
}

/** What a path holds right now; `null` when it does not exist. */
export type CurrentFile = {
  sha?: string | null;
  contentBase64?: string | null;
} | null;

/**
 * What a failed commit left behind.
 *
 * - `landed`: every file holds exactly what the commit would have written, so
 *   the commit applied and only its answer was lost. Retrying would write it
 *   twice.
 * - `lost-race`: a file moved on from the blob the commit was based on and no
 *   longer holds what it would have written, so another writer got there first
 *   and the work is to re-read and retry.
 * - `unchanged`: nothing says either; the failure stands as it was.
 */
export type FailedWriteOutcome = "landed" | "lost-race" | "unchanged";

const sameBytes = (a: string, b: string): boolean =>
  Buffer.from(a, "base64").equals(Buffer.from(b, "base64"));

/**
 * Decides what a commit that failed with an unrecognized server error did, by
 * reading the files it touched (w23/072).
 *
 * Production loses concurrent commits with a status or text the conflict
 * classifier does not know. Guessing from "the head moved" would retry a
 * commit that had landed (the head moves to the caller's own commit), so the
 * decision rests on content: a file that holds the intended bytes means the
 * commit landed; a file whose blob differs from the one the commit was based
 * on, without holding the intended bytes, means another commit won. A file
 * whose content cannot be read (too large to inline) decides nothing.
 */
export async function probeFailedWrite(
  operations: readonly ProbedOperation[],
  read: (path: string) => Promise<CurrentFile>,
): Promise<FailedWriteOutcome> {
  let allLanded = operations.length > 0;
  let lostRace = false;
  for (const operation of operations) {
    if (operation.operation === "delete") {
      allLanded = false;
      continue;
    }
    const current = await read(operation.path);
    const landed =
      current?.contentBase64 != null &&
      operation.contentBase64 !== undefined &&
      sameBytes(current.contentBase64, operation.contentBase64);
    if (!landed) allLanded = false;
    if (landed) continue;
    if (operation.operation === "update") {
      // Gone or on another blob: a different commit touched it.
      if (current === null || (current.sha && current.sha !== operation.sha)) {
        if (current === null || current.contentBase64 != null) lostRace = true;
      }
    } else if (current !== null && current.contentBase64 != null) {
      // A create over a file that now exists with other content.
      lostRace = true;
    }
  }
  if (allLanded) return "landed";
  return lostRace ? "lost-race" : "unchanged";
}

/** Logs the raw failure so a signature the classifier misses can be added to it. */
export function logUnclassifiedWriteFailure(
  error: unknown,
  context: Record<string, unknown>,
): void {
  log.warn("Unclassified Gitea write failure", {
    ...context,
    status: giteaErrorStatus(error),
    detail: giteaErrorMessage(error).slice(0, 500),
  });
}
