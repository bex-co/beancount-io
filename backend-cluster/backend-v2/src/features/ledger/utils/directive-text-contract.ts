import {
  NewLedgerErrorsError,
  UnbalancedTransactionError,
} from "@/shared/errors";
import {
  hasParseError,
  UNBALANCED_ERROR_CODE,
  type BeanCheckError,
} from "@/features/ledger/utils/bean-check-errors";

/**
 * What appending Beancount text asks for and answers with.
 *
 * Split out of `ledger-entry-service.ts` when the append moved into
 * `DirectiveAppendWorkflow` (w2/012): the service authorizes and delegates,
 * the workflow coordinates, and both need this vocabulary — so it lives where
 * neither has to import the other.
 */

/**
 * Most directives one `appendDirectiveText` call will accept (w2/m28:t005).
 *
 * A bounded batch keeps the projected bean-check — which loads the whole
 * ledger — proportional to one call, and a caller sending thousands of
 * directives wants an import, not an append.
 */
export const MAX_APPENDED_DIRECTIVES = 50;

/** One bean-check error as the ledger service reports it. */
export type DirectiveTextError = BeanCheckError;

/** What appending Beancount text asks for. */
export interface AppendDirectiveTextInput {
  /** Beancount directive text, as an agent would write it into a file. */
  readonly text: string;
  /** Target file. Omitted, each directive routes by the ledger's own rules. */
  readonly path?: string;
  /** Run every check and report the result without committing. */
  readonly dryRun?: boolean;
  /** Commit even when the text introduces new bean-check errors. */
  readonly allowInvalid?: boolean;
}

export interface AppendDirectiveTextResult {
  readonly success: boolean;
  readonly message: string;
  readonly dryRun: boolean;
  /** Directives parsed out of the text. */
  readonly count: number;
  /** Where each directive landed: file and 1-based line. */
  readonly wrote: readonly { path: string; line: number }[];
  /**
   * The hash each committed directive now carries, in text order; empty for
   * a dry run, or when they could not be resolved after the commit.
   */
  readonly entryHashes: readonly string[];
  /** Unified diff per touched file. Populated on dry runs only. */
  readonly diff: readonly { path: string; diff: string }[];
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: readonly DirectiveTextError[];
  /**
   * Files whose existing directives were out of date order, so the new ones
   * were appended at the end instead of threaded in.
   */
  readonly appendedUnsorted: readonly string[];
}

/**
 * The refusal for text that would break the ledger.
 *
 * An unbalanced transaction gets its own code because it is the one failure
 * an agent can act on mechanically — add the missing posting, or say
 * `allowInvalid` and mean it — and because `addLedgerEntries` already answers
 * `UNBALANCED` for the same mistake made in the structured dialect. The two
 * write paths refusing the same thing under different codes is exactly the
 * dialect problem w2/m28 removed.
 */
export function unbalancedOrValidationError(
  newErrors: readonly DirectiveTextError[],
): Error {
  const detail = newErrors
    .map((error) =>
      error.source ? `${error.message} (${error.source})` : error.message,
    )
    .join("; ");
  // The engine's code, not its prose (w2/013). Errors that predate the code
  // travelling through — or an engine build that reports none — fall back to
  // the wording, so a deployment mid-rollout degrades to the old behaviour
  // rather than misclassifying.
  const unbalanced = newErrors.some((error) =>
    error.code
      ? error.code === UNBALANCED_ERROR_CODE
      : /does not balance|residual/i.test(error.message),
  );
  if (unbalanced) {
    // bean-check states the residual in its own message; carrying it through
    // means the error's hint names the amount that is missing.
    const residual = /residual\s+(\S+\s*\S*)/i.exec(detail)?.[1] ?? "unknown";
    return new UnbalancedTransactionError(
      `Appending this text would leave a transaction unbalanced: ${detail}`,
      residual,
    );
  }
  // No code, the wording decides — the hint must not claim valid Beancount
  // for text that does not parse (w23/093).
  const hasParse = hasParseError(newErrors);
  return new NewLedgerErrorsError("text", newErrors.length, detail, {
    hasParseError: hasParse,
  });
}
