import { BadUserInputError } from "@/shared/errors";

/**
 * The most entries one bulk add or batch delete may carry (w23/103): a
 * runaway agent loop landed 20,000 entries in a single call, bounded only
 * by the 2 MiB body cap. 1000 matches the journal read `limit` cap; the
 * Beancount-text dialect caps separately at 50 projected directives
 * (`MAX_APPENDED_DIRECTIVES`) because projection pays per directive.
 */
export const MAX_BULK_ENTRIES = 1000;

/** Refuse an over-cap batch before any work, naming the cap and the fix. */
export function assertBulkEntriesSize(
  entries: readonly unknown[],
  verb: "added" | "deleted",
): void {
  if (entries.length > MAX_BULK_ENTRIES) {
    throw new BadUserInputError(
      `entries holds ${entries.length} entries; at most ${MAX_BULK_ENTRIES} may be ${verb} per call. Split into several calls.`,
    );
  }
}
