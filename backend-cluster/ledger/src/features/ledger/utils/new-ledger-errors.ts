import type { BeancountErrorPublic } from "@/foundation/ledger-api-types";
import { NewLedgerErrorsError, type LedgerWriteAction } from "@/shared/errors";

/**
 * The engine ends an interpolation or lot-match error with the entry's date
 * and narration, `(2026-08-30, "Groceries")`. Editing either one rewrote the
 * message, so the error the ledger already had read as a new one and the
 * entry could no longer be renamed or re-dated, which is when it most needs
 * editing (w21/367). Matching ignores that tag; the per-error count below
 * still makes a second broken entry count as introduced.
 *
 * A failed balance assertion quotes the figure the account actually reached
 * ("expected 40.00 USD, got 49.75 USD"), which any edit to an amount above it
 * changes, so correcting an entry while an assertion was off was refused as a
 * new error unless the edit fixed it exactly. The assertion is the same one:
 * matching keeps its account and expected amount and ignores "got" (w21/618).
 * The explicit-tolerance wording ("Balance exceeds explicit tolerance for A:
 * expected 100 USD ~ 0.01, got 0 USD (difference: 100)") also quotes the
 * reached figure and its difference, so it is trimmed the same way (w21/681).
 */
function withoutEntryTag(message: string): string {
  return message
    .replace(/ \(\d{4}-\d{2}-\d{2}, ".*"\)$/s, "")
    .replace(
      /^(Balance (?:failed|exceeds explicit tolerance) for [^:]+:.*?expected [^,]*), got .*$/s,
      "$1",
    );
}

/**
 * Errors in `after` that `before` did not have, matched by message and file
 * but not line: editing or deleting a block shifts every later line, so an
 * existing error below the edit moves without being new (w21/m1). Each
 * `before` error excuses one `after` error, in order, so a second copy of a
 * known message still counts as introduced.
 */
export function newLedgerErrors(
  before: readonly BeancountErrorPublic[],
  after: readonly BeancountErrorPublic[],
): BeancountErrorPublic[] {
  const key = (error: BeancountErrorPublic) =>
    `${withoutEntryTag(error.message)}\u0000${error.source?.filename ?? ""}`;
  const left = new Map<string, number>();
  for (const error of before) {
    left.set(key(error), (left.get(key(error)) ?? 0) + 1);
  }
  return after.filter((error) => {
    // A warning is not an error `bean-check` would refuse (w21/188).
    if (error.severity === "warning") return false;
    const count = left.get(key(error)) ?? 0;
    if (count > 0) left.set(key(error), count - 1);
    return count === 0;
  });
}

/**
 * Refuse a write whose projection (`after`) has errors the ledger did not
 * have. Every structured write — add, edit, delete — goes through here (w0/m2,
 * w21/m1). `before` is read only when the projection has errors at all: a
 * clean projection adds nothing, and today's errors cost a second parse.
 */
export async function refuseNewLedgerErrors(
  after: readonly BeancountErrorPublic[],
  before: () => Promise<readonly BeancountErrorPublic[]>,
  action: LedgerWriteAction,
): Promise<void> {
  if (after.every((error) => error.severity === "warning")) return;
  const introduced = newLedgerErrors(await before(), after);
  if (introduced.length > 0) {
    throw new NewLedgerErrorsError(introduced, action);
  }
}
