import { createHash } from "node:crypto";
import {
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

/** What every surface says about the field, so REST, GraphQL, and MCP agree. */
export const ENTRY_REQUEST_ID_DESCRIPTION =
  "Client-generated retry key, 1-200 characters. Send a new one per write and reuse it only to retry the same write: within 24 hours the same id and request return the first result without writing again; the same id with a different request is refused (VALIDATION_FAILED); a repeat while the first attempt is still writing is CONFLICT, so wait and retry with the same id. Omitted, the write is not deduplicated.";

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
  store?: IdempotencyStore;
}): Promise<T> {
  const { requestId, write } = params;
  if (requestId === undefined || requestId === null) return write();
  if (requestId.length < 1 || requestId.length > ENTRY_REQUEST_ID_MAX) {
    throw new ValidationError(
      "requestId",
      `requestId must be 1-${ENTRY_REQUEST_ID_MAX} characters`,
    );
  }

  const store = params.store ?? redisIdempotencyStore;
  const key = CACHE_KEYS.ledger.entryWriteRequest(
    params.userId,
    params.ledgerId,
    requestId,
  );
  const requestHash = createHash("sha256")
    .update(JSON.stringify([params.operation, params.request]))
    .digest("hex");

  const claim = await store.claim(key, requestHash, TTL.HOUR_24);
  if (claim === undefined) {
    idempotencyLogger.warn("Entry write proceeding without idempotency", {
      operation: params.operation,
    });
    return write();
  }
  if (!claim.claimed) {
    if (claim.record.requestHash !== requestHash) {
      throw new ValidationError(
        "requestId",
        "requestId was already used with a different write request",
      );
    }
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
