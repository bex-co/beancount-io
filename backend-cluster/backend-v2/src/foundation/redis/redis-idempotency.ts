import { getRedisClient } from "./redis-utils";
import { logger } from "@/shared/logger";

const idempotencyLogger = logger.child({ module: "redis-idempotency" });

/**
 * An idempotency record: the request's fingerprint, whether the first attempt
 * finished, and — once it has — the result it returned.
 */
export interface IdempotencyRecord {
  readonly requestHash: string;
  readonly status: "in-progress" | "done";
  readonly result?: unknown;
}

/**
 * Where idempotency records live. Every method resolves `undefined` (or
 * nothing) when the store is unreachable rather than throwing: callers decide
 * what an unavailable store means, and entry writes proceed unprotected.
 */
export interface IdempotencyStore {
  /**
   * Atomically claim `key` for `requestHash`, or return the record already
   * there. `undefined` when the store is unavailable.
   */
  claim(
    key: string,
    requestHash: string,
    ttlMs: number,
  ): Promise<
    | { claimed: true }
    | { claimed: false; record: IdempotencyRecord }
    | undefined
  >;
  /** Record the finished attempt's result. */
  complete(
    key: string,
    requestHash: string,
    result: unknown,
    ttlMs: number,
  ): Promise<void>;
  /** Forget a claim whose attempt failed, so a retry runs again. */
  release(key: string): Promise<void>;
}

/**
 * The Redis store. The claim is one `SET NX` in a script, so two backend
 * instances can never both win the same key; the cache helper's get-then-set
 * cannot promise that (see `redis-counter.ts`).
 */
export const redisIdempotencyStore: IdempotencyStore = {
  async claim(key, requestHash, ttlMs) {
    const client = getRedisClient();
    if (!client) return undefined;
    try {
      const existing = (await client.eval(
        `
        local claimed = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2])
        if claimed then return false end
        return redis.call('GET', KEYS[1])
        `,
        {
          keys: [key],
          arguments: [
            JSON.stringify({ requestHash, status: "in-progress" }),
            String(ttlMs),
          ],
        },
      )) as string | null;
      if (existing === null || existing === undefined) return { claimed: true };
      return {
        claimed: false,
        record: JSON.parse(existing) as IdempotencyRecord,
      };
    } catch {
      idempotencyLogger.warn("Idempotency store unavailable", {
        operation: "claim",
      });
      return undefined;
    }
  },
  async complete(key, requestHash, result, ttlMs) {
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.eval(`redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])`, {
        keys: [key],
        arguments: [
          JSON.stringify({ requestHash, status: "done", result }),
          String(ttlMs),
        ],
      });
    } catch {
      idempotencyLogger.warn("Idempotency store unavailable", {
        operation: "complete",
      });
    }
  },
  async release(key) {
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.eval(`redis.call('DEL', KEYS[1])`, {
        keys: [key],
        arguments: [],
      });
    } catch {
      idempotencyLogger.warn("Idempotency store unavailable", {
        operation: "release",
      });
    }
  },
};
