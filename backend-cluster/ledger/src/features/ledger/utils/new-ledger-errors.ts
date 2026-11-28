import type { BeancountErrorPublic } from "@/foundation/ledger-api-types";
import {
  NewLedgerErrorsError,
  UnbalancedTransactionError,
  type LedgerWriteAction,
} from "@/shared/errors";

/**
 * The engine's imbalance wording, shared with the structural balance check's
 * message (`transaction-balance.ts`). An edit whose ONLY new error speaks it
 * is refused as UNBALANCED like an add, not VALIDATION_FAILED (w23/087).
 */
const IMBALANCE_PREFIX = "Transaction does not balance";
const RESIDUAL_SUFFIX = /residual (.+)$/;

/**
 * `onecommodity`'s error, once per account (`one-commodity.ts`): it sits on
 * the account's last entry, so a later entry in another file moves it there.
 * It is matched on the account and its currencies, in whichever file it sits
 * (w31/127).
 */
const MIXED_ACCOUNT =
  /^(More than one (?:cost )?currency in account '[^']*': )(.*)$/s;

/**
 * Errors a plugin issues once per thing and places by a rule that reads
 * entries across files, as stock Beancount places them, so a write in one
 * file can move one into another without adding one. Each matches in
 * whichever file it sits, on its message:
 *
 * - `onecommodity`'s, on its account and its sorted currencies (w31/127).
 * - `coherent_cost`'s "Currency 'VTI' is used both with and without cost",
 *   once per currency, on the first transaction by date that holds it
 *   without a cost (`coherent-cost.ts`). An earlier one in another file, or
 *   deleting the first, moved it there (w31/128).
 * - `unique_prices`' "Disagreeing price entries", once per pair and day, on
 *   the price that comes first when the day's prices are sorted by line,
 *   whatever their file (`unique-prices.ts`), so lines written above one
 *   price moved it to the other's file (w31/128). The message names no pair
 *   or day; a second disagreeing pair or day still counts by the per-message
 *   count.
 * - `noduplicates`' "Duplicate entry: …" for a balance, note or event, on
 *   the later copy by date and line, whatever their file (`noduplicates.ts`,
 *   w31/128).
 */
const PLACED_ACROSS_FILES = [
  MIXED_ACCOUNT,
  /^Currency '[^']*' is used both with and without cost$/,
  /^Disagreeing price entries$/,
  /^Duplicate entry: /,
];

/** Whether an error with this matching message matches in any file. */
const placedAcrossFiles = (message: string) =>
  PLACED_ACROSS_FILES.some((pattern) => pattern.test(message));

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
 * `check_drained`'s zero balance on a close is in Beancount's words
 * ("Balance failed for 'A': expected 0 USD != accumulated 49.75 USD (49.75
 * too much)"), so its accumulated figure is trimmed too (w31/156).
 *
 * A lot-booking error quotes the account's lots: "Not enough units in A:
 * requested 10, available 5" and "Ambiguous lot match for HOOL: 2 lots match
 * in A". A buy dated before the reduction changes that figure, so importing a
 * sale's missing buys one batch at a time was refused on every partial batch
 * (w31/115). The reduction is the same one: matching keeps the account and
 * the requested amount and ignores what is available and how many lots match.
 *
 * `check_commodity` reports each undeclared currency once, naming the first
 * account that uses it (`check-commodity.ts`): "Missing Commodity directive
 * for 'USD' in 'Assets:Bank'". Opening an account that sorts first names
 * that account instead, so the error the ledger already had read as new and
 * the write was refused (w31/127). The currency is the error's identity:
 * matching drops the account. `onecommodity`'s "More than one currency in
 * account 'A': USD,EUR" lists the currencies in the order they were first
 * used, so an earlier entry in the other one reversed the list. Matching
 * sorts them.
 */
function withoutEntryTag(message: string): string {
  return message
    .replace(/ \(\d{4}-\d{2}-\d{2}, ".*"\)$/s, "")
    .replace(
      /^(Balance (?:failed|exceeds explicit tolerance) for [^:]+:.*?expected [^,]*), got .*$/s,
      "$1",
    )
    .replace(
      /^(Balance failed for '[^']*': expected \S+ \S+) != accumulated .*$/s,
      "$1",
    )
    .replace(
      /^((?:Not enough units in|Insufficient units of) .*?: requested [^,]*), available [^;]*/s,
      "$1",
    )
    .replace(/^(Ambiguous lot match for [^:]+: )\d+ (lots match in )/, "$1$2")
    .replace(/^(Ambiguous match: )\d+ (lots match for )/, "$1$2")
    .replace(/^(Missing Commodity directive for '[^']*') in '.*'$/s, "$1")
    .replace(
      MIXED_ACCOUNT,
      (_, head: string, currencies: string) =>
        `${head}${currencies.split(",").sort().join(",")}`,
    );
}

/**
 * Lines a write moves to another file: the 0-based lines `[start, end)` of
 * `file` as it stands, which land in `to`. An entry move writes one per
 * moved entry (w31/126).
 */
export interface MovedLines {
  file: string;
  start: number;
  end: number;
  to: string;
}

/**
 * Errors in `after` that `before` did not have, matched by message and file
 * but not line: editing or deleting a block shifts every later line, so an
 * existing error below the edit moves without being new (w21/m1). Each
 * `before` error excuses one `after` error, in order, so a second copy of a
 * known message still counts as introduced. A plugin error placed by a rule
 * that reads across files matches in any file (w31/127, w31/128).
 *
 * An error inside lines the write `moved` is matched in the file they move
 * to: an entry that already had an error carries it to its new file, where
 * keyed on the old one it read as new and the move was refused (w31/126).
 */
export function newLedgerErrors(
  before: readonly BeancountErrorPublic[],
  after: readonly BeancountErrorPublic[],
  moved: readonly MovedLines[] = [],
): BeancountErrorPublic[] {
  const key = (error: BeancountErrorPublic, file = error.source?.filename) => {
    const message = withoutEntryTag(error.message);
    return `${message}\u0000${placedAcrossFiles(message) ? "" : (file ?? "")}`;
  };
  const fileBefore = ({ source }: BeancountErrorPublic) => {
    if (!source) return undefined;
    const index = source.lineno - 1;
    const block = moved.find(
      ({ file, start, end }) =>
        file === source.filename && start <= index && index < end,
    );
    return block?.to ?? source.filename;
  };
  const left = new Map<string, number>();
  for (const error of before) {
    const k = key(error, fileBefore(error));
    left.set(k, (left.get(k) ?? 0) + 1);
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
 * What a write's projection check found: the ledger's error count before and
 * after, plus the errors the write would introduce. Computed for every
 * structured write and returned on the response; `allowInvalid` suppresses
 * only the refusal, never the detection (w23/161). Counts exclude warnings,
 * as the diff does.
 */
export type ProjectedLedgerErrors = {
  errorsBefore: number;
  errorsAfter: number;
  newErrors: BeancountErrorPublic[];
};

const isError = (error: BeancountErrorPublic): boolean =>
  error.severity !== "warning";

/** Errors bean-check fails on: the engine's warnings are not errors (w21/188). */
const countLedgerErrors = (
  errors: readonly BeancountErrorPublic[],
): number => errors.filter(isError).length;

/**
 * Diff a write's projection (`after`) against the ledger it would land on.
 * `before` is always read: the counts are reported on the response whether
 * the write is refused, committed, or previewed.
 */
export async function projectNewLedgerErrors(
  after: readonly BeancountErrorPublic[],
  before: () => Promise<readonly BeancountErrorPublic[]>,
  moved?: readonly MovedLines[],
): Promise<ProjectedLedgerErrors> {
  const beforeErrors = await before();
  return {
    errorsBefore: countLedgerErrors(beforeErrors),
    errorsAfter: countLedgerErrors(after),
    newErrors: newLedgerErrors(beforeErrors, after, moved),
  };
}

/**
 * Lines one edit of a write replaced in a file: the 0-based lines
 * `[start, end)` of the text as the edit found it, now `lines` long. A cut
 * entry is a replacement by nothing; an added include line replaces nothing.
 */
export interface LineEdit {
  start: number;
  end: number;
  lines: number;
}

/** Each file's edits, by path, in the order the write made them. */
export type SourceLineEdits = ReadonlyMap<string, readonly LineEdit[]>;

/**
 * The projection with each new error at its line in the file as it stands.
 * The engine reads the written text, where an edit above an error moves it,
 * so a refused delete named the line after the cut (w5/1202) and an edit
 * that made an entry one line longer named the line below the error
 * (w31/116). A refusal and a preview commit nothing, so both name the
 * reader's line. An error on a line the write itself wrote has no line in
 * the file as it stands and keeps its own, the one the preview shows.
 */
export function atLinesBeforeEdits(
  projection: ProjectedLedgerErrors,
  edits: SourceLineEdits,
): ProjectedLedgerErrors {
  return {
    ...projection,
    newErrors: projection.newErrors.map((error) => {
      const source = error.source;
      const made = source && edits.get(source.filename);
      if (!source || !made) return error;
      // Undo the edits last to first, each in the text it produced.
      let index = source.lineno - 1;
      for (const { start, end, lines } of [...made].reverse()) {
        if (index < start) continue;
        if (index < start + lines) return error;
        index += end - start - lines;
      }
      return { ...error, source: { ...source, lineno: index + 1 } };
    }),
  };
}

/**
 * Refuse a write whose projection has errors the ledger did not have. Every
 * structured write — add, edit, delete — goes through here (w0/m2, w21/m1).
 */
export async function refuseNewLedgerErrors(
  after: readonly BeancountErrorPublic[],
  before: () => Promise<readonly BeancountErrorPublic[]>,
  action: LedgerWriteAction,
): Promise<void> {
  refuseProjectedErrors(await projectNewLedgerErrors(after, before), action);
}

/**
 * The refusal half of the write gate, over an already-computed projection:
 * callers that report the projection refuse from it instead of diffing twice.
 */
export function refuseProjectedErrors(
  projection: ProjectedLedgerErrors,
  action: LedgerWriteAction,
): void {
  const introduced = projection.newErrors;
  if (introduced.length === 0) return;
  const [only] = introduced;
  if (introduced.length === 1 && only !== undefined) {
    const text = withoutEntryTag(only.message);
    const residual = RESIDUAL_SUFFIX.exec(text)?.[1];
    if (text.startsWith(IMBALANCE_PREFIX) && residual !== undefined) {
      throw new UnbalancedTransactionError(
        only.source
          ? `${only.message} (${only.source.filename}:${only.source.lineno})`
          : only.message,
        { residual },
      );
    }
  }
  throw new NewLedgerErrorsError(introduced, action);
}
