import { ConflictError } from "@/shared/errors";
import { logger } from "@/shared/logger";

const raceLogger = logger.child({ module: "entry-write-race" });

/** Commits an entry write attempts before a lost race is the caller's: the file edit's bound (w23/017). */
export const ENTRY_WRITE_ATTEMPTS = 3;

/**
 * What a caller is told once every attempt lost. These writes take no `sha`,
 * so the file-version hint the ledger's conflict maps to (w23/178) names an
 * argument the caller cannot send.
 */
const ENTRY_WRITE_RACE_HINT =
  "None of this call's directives were committed. Send the same call again: it re-reads the ledger and re-checks the write. If the call carries a `requestId`, keep the same one, so the write is never applied twice.";

/**
 * Run an appending entry write again when a concurrent write wins the commit
 * (w31/007).
 *
 * `addLedgerEntries` and `appendLedgerText` read the files they target, check
 * the projected ledger, then commit against the blob shas they read. When
 * another write lands in between, the ledger refuses that commit as a lost
 * compare-and-swap and nothing is written. The caller holds no `sha` to
 * refresh, so the retry is this side's: each attempt runs the whole write
 * again, re-reading the files and re-running bean-check and the balance check
 * against what landed. Two appends both commit, and a refusal still applies
 * to the fresh content, which is what the file edit's re-apply loop does for
 * exact-text edits (w23/017).
 *
 * Only a `ConflictError` is retried. A commit that landed never reaches here as
 * one: the ledger settles a commit that lost its answer as landed (w23/072).
 */
export async function retryLostEntryWriteRace<T>(
  write: () => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await write();
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error;
      if (attempt >= ENTRY_WRITE_ATTEMPTS) {
        throw new ConflictError(
          "Ledger",
          `concurrent writes changed the ledger before each of ${ENTRY_WRITE_ATTEMPTS} attempts could commit`,
          { hint: ENTRY_WRITE_RACE_HINT },
        );
      }
      raceLogger.info("Entry write lost a race; retrying on fresh content", {
        attempt,
      });
    }
  }
}
