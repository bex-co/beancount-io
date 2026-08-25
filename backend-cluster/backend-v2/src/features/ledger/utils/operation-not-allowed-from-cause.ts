import { FavaApiError, favaApiErrorToDomainError } from "@/foundation/fava";
import { OperationNotAllowedError } from "@/shared/errors";

/**
 * Translate structured ledger-service failures through the shared Fava error
 * mapper. Raw pre-receive-hook failures have no HTTP response to classify, so
 * those remain `OperationNotAllowedError`s with the hook's reason preserved.
 *
 * `cause` is undefined when `unwrapFavaResponse`'s "response body says
 * success: false" branch calls this (no thrown error to describe) — falls
 * back to a generic reason rather than the literal string "undefined".
 */
export function operationNotAllowedFromCause(
  operation: string,
  cause?: unknown,
): Error {
  if (cause instanceof FavaApiError) {
    return favaApiErrorToDomainError(cause, operation);
  }

  const reason =
    cause === undefined
      ? "request failed"
      : cause instanceof Error
        ? cause.message
        : String(cause);
  return new OperationNotAllowedError(operation, reason);
}
