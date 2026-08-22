import { FavaApiError } from "@/foundation/fava";
import {
  OperationNotAllowedError,
  ResourceLimitReachedError,
} from "@/shared/errors";

const DIRECTIVE_LIMIT_EXCEEDED_CODE = "directive_limit_exceeded";

/**
 * Build an `OperationNotAllowedError` (or, for the free-tier directive limit,
 * a `ResourceLimitReachedError`) from an `unwrapFavaResponse` `makeError`
 * cause. Git writes (create/update/delete/rename ledger files, add entries)
 * can be rejected by ledger-service's proactive directive-limit pre-check or
 * by Gitea's pre-receive hooks directly — this preserves the underlying
 * rejection message instead of the default `InternalServerError`, which
 * would otherwise be masked to a generic "Internal server error" in
 * production.
 *
 * `cause` is undefined when `unwrapFavaResponse`'s "response body says
 * success: false" branch calls this (no thrown error to describe) — falls
 * back to a generic reason rather than the literal string "undefined".
 */
export function operationNotAllowedFromCause(
  operation: string,
  cause?: unknown,
): Error {
  if (
    cause instanceof FavaApiError &&
    cause.body?.code === DIRECTIVE_LIMIT_EXCEEDED_CODE &&
    typeof cause.body.details?.limit === "number" &&
    typeof cause.body.details?.current === "number"
  ) {
    return new ResourceLimitReachedError(
      "directives",
      cause.body.details.limit,
      cause.body.details.current,
      // ledger-v2's own wording, passed through rather than rebuilt: it names
      // deleting entries as the way back under the limit, which is exactly what
      // the git proxy's refusal tells the user to come here and do.
      cause.body.error || undefined,
    );
  }

  const reason =
    cause === undefined
      ? "request failed"
      : cause instanceof Error
        ? cause.message
        : String(cause);
  return new OperationNotAllowedError(operation, reason);
}
