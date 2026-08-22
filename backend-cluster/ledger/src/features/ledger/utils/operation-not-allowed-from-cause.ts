import {
  ConflictError,
  NotFoundError,
  OperationNotAllowedError,
  ResourceLimitReachedError,
} from "@/shared/errors";
import {
  giteaErrorMessage,
  giteaErrorStatus,
  isGiteaWriteConflict,
} from "@/features/gitea/utils/gitea-error";

/**
 * The pre-receive size hook rejects an over-quota push through an untyped
 * Gitea 500 whose message embeds the hook's stderr. Detect its stable markers
 * (the decision reason codes and the headline sentence emitted by
 * `enforce-repo-size-limit.sh`) so writes that only the hook gates — the file
 * editor, renames, AI edits — still surface as RESOURCE_LIMIT_REACHED, the
 * category dashboard/mobile upsell flows key on, matching the structured
 * limit error the Python service's proactive pre-check used to return.
 */
const QUOTA_REJECTION_RE =
  /repo_size_limit_exceeded|repo_storage_limit_exceeded|incoming_object_limit_exceeded|repository size limit exceeded/iu;

function quotaErrorFromHookMessage(
  message: string,
): ResourceLimitReachedError | undefined {
  if (!QUOTA_REJECTION_RE.test(message)) return undefined;
  // Best-effort numbers from the hook's stderr wording ("… the limit is
  // N KiB", "Repository storage is N bytes" / "snapshot is N bytes"); the
  // category is what clients act on, so absent numbers fall back to 0.
  const limitKib = /limit is (\d+) KiB/iu.exec(message);
  const currentBytes = /(?:storage|snapshot) is (\d+) bytes/iu.exec(message);
  return new ResourceLimitReachedError(
    "Ledger snapshot size (bytes)",
    limitKib ? Number(limitKib[1]) * 1024 : 0,
    currentBytes ? Number(currentBytes[1]) : 0,
  );
}

/**
 * Map a git-write rejection cause to a `DomainError`. Git writes (create/
 * update/delete/rename ledger files, add entries) commit through Gitea
 * directly; the generated client rejects with the failed `HttpResponse` — a
 * `Response` subclass, NOT an `Error` — so the status/message must be read off
 * its `.status` / parsed `.error` body (`String(cause)` would yield the useless
 * "[object Response]"). Same status taxonomy as `commit-ledger-files`:
 *
 *   - `404` → `NotFoundError` (missing file/repo — not a policy rejection);
 *   - `409` / `422` sha-mismatch (`isGiteaWriteConflict`) → `ConflictError`
 *     (the caller-supplied blob SHA went stale under a concurrent write);
 *   - anything else → `OperationNotAllowedError` carrying the underlying
 *     reason (e.g. Gitea's pre-receive hooks rejecting the push), instead of
 *     the default `InternalServerError` which would be masked to a generic
 *     "Internal server error" in production.
 *
 * App-mediated append paths run a friendly snapshot-size estimate before the
 * write. The authoritative pre-receive rejection can still reach this mapper
 * for every write path and for concurrent growth.
 *
 * `cause` is undefined when there is no thrown error to describe — falls back to
 * a generic reason rather than the literal string "undefined".
 */
export function giteaWriteErrorFromCause(
  operation: string,
  cause?: unknown,
  resource = "Ledger file",
): Error {
  const status = giteaErrorStatus(cause);
  if (status !== undefined) {
    if (status === 404) {
      return new NotFoundError(resource);
    }
    if (isGiteaWriteConflict(cause)) {
      return new ConflictError(
        resource,
        "it changed since it was loaded; refresh and retry",
      );
    }
    const message = giteaErrorMessage(cause);
    const quotaError = quotaErrorFromHookMessage(message);
    if (quotaError) {
      return quotaError;
    }
    const statusFallback = `Gitea request failed with HTTP ${status}`;
    return new OperationNotAllowedError(
      operation,
      message && message !== statusFallback
        ? message
        : `request failed with status ${status}`,
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
