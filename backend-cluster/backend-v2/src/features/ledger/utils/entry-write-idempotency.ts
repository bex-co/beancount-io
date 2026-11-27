import { createHash } from "node:crypto";
import {
  type IdempotencyRecord,
  type IdempotencyStore,
  redisIdempotencyStore,
} from "@/foundation/redis/redis-idempotency";
import { CACHE_KEYS, TTL } from "@/shared/cache";
import { ConflictError, ValidationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { CREATE_REQUEST_ID_MAX } from "@/features/ledger/setup/build-ledger";

const idempotencyLogger = logger.child({ module: "entry-write-idempotency" });

/** The longest accepted `requestId`, the same bound ledger creation uses. */
export const ENTRY_REQUEST_ID_MAX = CREATE_REQUEST_ID_MAX;

/**
 * Refuse an empty, whitespace-only, or oversized `requestId` before touching
 * Redis or executing a write (w21/203, w31/044). Kept verbatim — never
 * silently trimmed — so an agent sending `"   "` learns its key was blank
 * rather than silently disabling idempotency or colliding on a blank key.
 */
export function assertRequestId(requestId: string): void {
  if (requestId.length < 1 || requestId.length > ENTRY_REQUEST_ID_MAX) {
    throw new ValidationError(
      "requestId",
      `requestId must be 1-${ENTRY_REQUEST_ID_MAX} characters`,
    );
  }
  if (requestId.trim().length < 1) {
    throw new ValidationError("requestId", "requestId must not be blank");
  }
}

/** What every surface says about the field, so REST, GraphQL, and MCP agree. */
export const ENTRY_REQUEST_ID_DESCRIPTION =
  "Client-generated retry key, 1-200 characters. Send a new one per write and reuse it only to retry the same write: within 24 hours the same id and request return the first result without writing again; the same id with a different request is refused (VALIDATION_FAILED); a repeat while the first attempt is still writing is CONFLICT, so wait and retry with the same id. Omitted, the write is not deduplicated.";

/**
 * A request as plain data with its object keys sorted and absent fields
 * (`undefined` or `null`) dropped. Each surface builds the request in its own
 * key order — GraphQL's posting input puts `units` before `account`, zod keeps
 * the caller's — so hashing the objects as built refused a replay of the same
 * write from another surface (w1/220).
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  // A Date (or anything else with its own JSON form) hashes as JSON writes it.
  const { toJSON } = value as { toJSON?: () => unknown };
  if (typeof toJSON === "function") return canonical(toJSON.call(value));
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => {
        const field = (value as Record<string, unknown>)[key];
        return field !== undefined && field !== null;
      })
      .sort()
      .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
  );
}

/** The refusal for an id already used with another request, preview or commit. */
function assertSameRequest(
  record: IdempotencyRecord,
  requestHash: string,
): void {
  if (record.requestHash !== requestHash) {
    throw new ValidationError(
      "requestId",
      "requestId was already used with a different write request",
    );
  }
}

/**
 * What a preview says when its id already committed the same request: its
 * commit returns that first result and writes nothing (w31/136).
 */
export function replayedPreviewMessage(commit: string | undefined): string {
  return `Would add nothing: this requestId already made this write${commit ? ` in commit ${commit}` : ""}, so the commit returns that result and writes nothing again`;
}

/**
 * Run an entry write at most once per `requestId` (w3/m61, owner decision
 * 2026-11-02, after ledger creation's ADR026 contract).
 *
 * - No `requestId`: the write runs exactly as before and the store is never
 *   touched.
 * - The same id and request within 24 hours returns the first result without
 *   writing again; the same id with a different request is refused; a repeat
 *   while the first attempt runs is a retryable conflict.
 * - A write that throws, or whose result `committed` rejects, committed
 *   nothing, so its id is released and a retry runs again.
 * - An unavailable store never stops a save: the write proceeds unprotected,
 *   exactly as it would without an id, and the miss is logged.
 *
 * A crash after the commit but before the record is marked done leaves it in
 * progress: retries get the conflict, never a duplicate.
 *
 * A dry run (`preview`) writes nothing, so it records nothing, but it answers
 * as its commit would, or a `valid: true` preview resent without `dry_run`
 * fails on an argument the preview accepted (w1/195, w31/136): it refuses a
 * malformed id, and an id already used with a different request; and when the
 * id already committed this same request it returns `preview.replay(first)`
 * instead of projecting a second copy, because the commit would return `first`
 * and write nothing. An id still in progress, or an unavailable store, previews
 * as usual.
 */
export async function runIdempotentEntryWrite<T>(params: {
  userId: string;
  ledgerId: string;
  /** Which write: part of the fingerprint, so one id never spans two kinds. */
  operation: "bulkEntries" | "appendText" | "insertReceipt";
  requestId: string | null | undefined;
  /** The write's input, as the service normalized it; transport details excluded. */
  request: unknown;
  write: () => Promise<T>;
  /** Whether a result that did not throw committed; a refusal is not stored. */
  committed: (result: T) => boolean;
  /**
   * Set on a dry run. `replay` turns the result the commit would replay into
   * what the preview answers.
   */
  preview?: { replay: (first: T) => T };
  store?: IdempotencyStore;
}): Promise<T> {
  const { requestId, write } = params;
  if (requestId === undefined || requestId === null) return write();
  assertRequestId(requestId);

  const store = params.store ?? redisIdempotencyStore;
  const key = CACHE_KEYS.ledger.entryWriteRequest(
    params.userId,
    params.ledgerId,
    requestId,
  );
  const requestHash = createHash("sha256")
    .update(JSON.stringify(canonical([params.operation, params.request])))
    .digest("hex");

  if (params.preview) {
    const record = await store.peek(key);
    if (record) assertSameRequest(record, requestHash);
    if (record?.status === "done") {
      return params.preview.replay(record.result as T);
    }
    return write();
  }

  const claim = await store.claim(key, requestHash, TTL.HOUR_24);
  if (claim === undefined) {
    idempotencyLogger.warn("Entry write proceeding without idempotency", {
      operation: params.operation,
    });
    return write();
  }
  if (!claim.claimed) {
    assertSameRequest(claim.record, requestHash);
    if (claim.record.status === "done") return claim.record.result as T;
    throw new ConflictError(
      "Entry write",
      "A write with this requestId is still in progress",
      {
        // The machine-readable marker clients retry on; the wording may change.
        requestInProgress: true,
        hint: "Wait a few seconds and repeat the same call with the same requestId: once the first attempt finishes it returns that result, or that attempt's refusal. Send a new requestId only for a different write.",
      },
    );
  }

  let result: T;
  try {
    result = await write();
  } catch (error) {
    await store.release(key);
    throw error;
  }
  if (!params.committed(result)) {
    await store.release(key);
    return result;
  }
  await store.complete(key, requestHash, result, TTL.HOUR_24);
  return result;
}
