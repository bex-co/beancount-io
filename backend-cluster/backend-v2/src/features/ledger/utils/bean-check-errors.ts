/**
 * bean-check's errors, reduced to what a caller can act on.
 *
 * Extracted from the MCP write tools' validation helper (w2/m28) once the
 * ledger service needed the same three operations: shape a ledger-service
 * error, say which errors a write introduced, and count them. Three copies of
 * "which errors are new" would each be free to drift on the equality key, and
 * the one that drifts is the one nobody reads.
 */

/** One bean-check error: the message plus the `file:line` it points at. */
export interface BeanCheckError {
  readonly message: string;
  /** `file:line` of the offending directive, when the loader reports one. */
  readonly source?: string;
  /**
   * The engine's stable error code, when it reported one (w2/013).
   *
   * Classification reads this. The message is prose the engine is free to
   * reword, and a caller that branched on its wording — as this one did, with
   * `/does not balance|residual/i` — would silently downgrade an unbalanced
   * transaction to a generic validation failure the day it changed.
   */
  readonly code?: string;
}

/** A transaction whose postings do not sum to zero, per the ledger engine. */
export const UNBALANCED_ERROR_CODE = "E3001";

/**
 * A located syntax error, per the ledger engine (`parseMultiFile` reports
 * these with file and line; w21/187). An unlocatable file keeps the `LOAD`
 * code with a "parse errors in ..." summary instead.
 */
export const PARSE_ERROR_CODE = "P0012";

/** The engine's one-per-file syntax-error summary, with no file or line. */
export const LOAD_ERROR_CODE = "LOAD";
const LOAD_PARSE_SUMMARY_PATTERN = /^parse errors in /;

/**
 * Whether any of the errors is the text failing to parse. The engine's code,
 * not its prose (w2/013): a located syntax error is `P0012`, an unlocatable
 * file keeps the `LOAD` summary; with no code, fall back to the wording.
 */
export function hasParseError(errors: readonly BeanCheckError[]): boolean {
  return errors.some((error) =>
    error.code !== undefined
      ? error.code === PARSE_ERROR_CODE ||
        (error.code === LOAD_ERROR_CODE &&
          LOAD_PARSE_SUMMARY_PATTERN.test(error.message))
      : /parse error/i.test(error.message),
  );
}

/** bean-check's verdict around a write. */
export interface WriteValidation {
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: BeanCheckError[];
  /**
   * `false` when bean-check could not run before or after the write, so the
   * counts above say nothing; `checkError` says why (w23/031).
   */
  readonly checked?: false;
  readonly checkError?: string;
}

/**
 * Reduce ledger-service errors to the actionable shape: what bean-check fails
 * on. The engine's warnings (a one-posting entry, closing an account with a
 * balance) are not errors and do not count as one (w21/188).
 */
export function toBeanCheckErrors(
  errors: readonly {
    message: string;
    source?: { filename: string; lineno: number } | null;
    code?: string | null;
    severity?: string | null;
  }[],
): BeanCheckError[] {
  return (errors ?? [])
    .filter((error) => error.severity !== "warning")
    .map((error) => ({
      message: error.message,
      ...(error.source
        ? { source: `${error.source.filename}:${error.source.lineno}` }
        : {}),
      ...(error.code ? { code: error.code } : {}),
    }));
}

/**
 * The engine ends an interpolation or lot-match error with the entry's date
 * and narration, `(2026-08-30, "Groceries")`, so editing either one rewrote
 * an existing error's message.
 */
function withoutEntryTag(message: string): string {
  return message.replace(/ \(\d{4}-\d{2}-\d{2}, ".*"\)$/s, "");
}

/**
 * Errors in `after` that `before` did not have, matched by message and file
 * but not line: a write that inserts or removes lines moves every error below
 * it without introducing one, and keying on `file:line` refused a valid append
 * over the moved error (w23/034). Each `before` error excuses one `after`
 * error, so a second copy of a known message still counts as new. This is the
 * ledger service's `newLedgerErrors` rule (w21/m1), restated because packages
 * share no code.
 */
export function diffBeanCheckErrors(
  before: readonly BeanCheckError[],
  after: readonly BeanCheckError[],
): BeanCheckError[] {
  const key = (error: BeanCheckError) =>
    `${withoutEntryTag(error.message)}\u0000${error.source?.replace(/:\d+$/, "") ?? ""}`;
  const left = new Map<string, number>();
  for (const error of before) {
    left.set(key(error), (left.get(key(error)) ?? 0) + 1);
  }
  return after.filter((error) => {
    const count = left.get(key(error)) ?? 0;
    if (count > 0) left.set(key(error), count - 1);
    return count === 0;
  });
}

export function toWriteValidation(
  before: readonly BeanCheckError[],
  after: readonly BeanCheckError[],
): WriteValidation {
  return {
    errorsBefore: before.length,
    errorsAfter: after.length,
    newErrors: diffBeanCheckErrors(before, after),
  };
}

/**
 * A structured write's projection check, as the ledger reports it: the error
 * counts before and after plus the errors the write adds. Always computed —
 * `allowInvalid` suppresses only the refusal (w23/161). A preview's ground
 * truth: nothing was committed, so no post-write read can see what the write
 * would break.
 */
export interface ReportedProjection {
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: BeanCheckError[];
}

/**
 * Shape the ledger's `errors_before`/`errors_after`/`new_errors` triple. A
 * ledger service older than the report answers without the fields; the
 * report then reads clean rather than failing the write.
 */
export function toReportedProjection(data: {
  errors_before?: number | null;
  errors_after?: number | null;
  new_errors?:
    | readonly {
        message: string;
        source?: { filename: string; lineno: number } | null;
        code?: string | null;
        severity?: string | null;
      }[]
    | null;
}): ReportedProjection {
  return {
    errorsBefore: data.errors_before ?? 0,
    errorsAfter: data.errors_after ?? 0,
    newErrors: toBeanCheckErrors(data.new_errors ?? []),
  };
}
