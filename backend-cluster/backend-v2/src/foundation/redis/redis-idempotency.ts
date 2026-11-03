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
 * Run one script against the shared client, failing open: `undefined` when
 * Redis is not initialized or the command fails. Only the operation name is
 * logged, never a key or argument.
 */
async function run<T>(
  operation: "claim" | "complete" | "release",
  script: string,
  keys: string[],
  args: string[],
): Promise<T | undefined> {
  const client = getRedisClient();
  if (!client) return undefined;
  try {
    return (await client.eval(script, { keys, arguments: args })) as T;
  } catch {
    idempotencyLogger.warn("Idempotency store unavailable", { operation });
    return undefined;
  }
}

/**
 * The Redis store. The claim is one `SET NX` in a script, so two backend
 * instances can never both win the same key; the cache helper's get-then-set
 * cannot promise that (see `redis-counter.ts`). The bounded client exposes
 * only `eval`, so the plain writes are scripts too.
 */
export const redisIdempotencyStore: IdempotencyStore = {
  async claim(key, requestHash, ttlMs) {
    const existing = await run<string | null>(
      "claim",
      `
      local claimed = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2])
      if claimed then return false end
      return redis.call('GET', KEYS[1])
      `,
      [key],
      [JSON.stringify({ requestHash, status: "in-progress" }), String(ttlMs)],
    );
    if (existing === undefined) return undefined;
    if (existing === null) return { claimed: true };
    return {
      claimed: false,
      record: JSON.parse(existing) as IdempotencyRecord,
    };
  },
  async complete(key, requestHash, result, ttlMs) {
    await run(
      "complete",
      `redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])`,
      [key],
      [JSON.stringify({ requestHash, status: "done", result }), String(ttlMs)],
    );
  },
  async release(key) {
    await run("release", `redis.call('DEL', KEYS[1])`, [key], []);
  },
};
