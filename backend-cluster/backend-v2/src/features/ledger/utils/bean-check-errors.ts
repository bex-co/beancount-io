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

/** bean-check's verdict around a write. */
export interface WriteValidation {
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: BeanCheckError[];
}

/** Reduce ledger-service errors to the actionable shape. */
export function toBeanCheckErrors(
  errors: readonly {
    message: string;
    source?: { filename: string; lineno: number } | null;
    code?: string | null;
  }[],
): BeanCheckError[] {
  return (errors ?? []).map((error) => ({
    message: error.message,
    ...(error.source
      ? { source: `${error.source.filename}:${error.source.lineno}` }
      : {}),
    ...(error.code ? { code: error.code } : {}),
  }));
}

/** Errors in `after` that were not already in `before`, by message+source. */
export function diffBeanCheckErrors(
  before: readonly BeanCheckError[],
  after: readonly BeanCheckError[],
): BeanCheckError[] {
  return after.filter(
    (candidate) =>
      !before.some(
        (existing) =>
          existing.message === candidate.message &&
          existing.source === candidate.source,
      ),
  );
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
