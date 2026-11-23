import { BadUserInputError } from "@/shared/errors";

/**
 * A Git blob SHA as Git/Gitea issues it: 40 lowercase hex digits (SHA-1) or
 * 64 lowercase hex digits (SHA-256).
 */
const BLOB_SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

/**
 * Validate an explicitly supplied Git blob `sha` upfront as `BAD_USER_INPUT`
 * instead of silently dropping an optimistic lock, flipping a REST PUT into
 * a create, or round-tripping to Gitea and answering a misleading `CONFLICT`
 * (w31/066).
 */
export function assertBlobShaFormat(sha: string, field = "sha"): void {
  if (typeof sha !== "string" || !BLOB_SHA_PATTERN.test(sha)) {
    throw new BadUserInputError(
      "sha must be a 40- or 64-character lowercase hex Git blob SHA from readLedgerFiles or GET …/files/{path}",
      field,
      "Read the file's current `sha` (MCP `readLedgerFiles`, or REST `GET` on the file) and pass it verbatim, or omit `sha` where optional.",
    );
  }
}
