import { type Cache } from "cache-manager";
import { createCacheHelper, type CacheHelper } from "@/shared/cache";

/**
 * A strict, JSON-serialized Redis record store for the short-lived
 * token/session "Redis-backed models" (auth tokens, invitation redemption
 * sessions). It wraps the **strict** cacheHelper so a dropped write surfaces to
 * the caller instead of failing open, and centralizes two shapes those models
 * were each hand-rolling:
 *
 * - a keyed JSON record (`putRecord`/`getRecord`/`deleteRecord`),
 * - a keyed raw string pointer (`putRaw`/`getRaw`) for one-to-one secondary
 *   indexes (e.g. email → session id), and
 * - a one-to-many secondary index of ids (`addToIndex`/`readIndex`/`clearIndex`)
 *   used to invalidate every record tied to some parent (e.g. all redemption
 *   sessions for an invitation).
 *
 * Callers own their key namespace — build keys with `CACHE_KEYS` and pass full
 * keys in. Records are serialized with `JSON.stringify`, matching the existing
 * auth models (so a value's shape on the wire is unchanged); the raw pointer is
 * stored verbatim and the one-to-many index as a raw string array (the Keyv
 * superjson codec round-trips it). Models that keep a JSON-serialized id array
 * (magic-link, email-token) store it through `putRecord`/`getRecord` instead,
 * which preserves their existing `JSON.stringify(ids)` wire shape.
 *
 * @example
 * const store = createRedisRecordStore(cache);
 * await store.putRecord(CACHE_KEYS.auth.signupOtpSessionById(id), session, TTL.MIN_30);
 */
export interface RedisRecordStore {
  /** Store a record as JSON under `key` with a TTL in milliseconds. */
  putRecord<T>(key: string, value: T, ttlMs: number): Promise<void>;
  /** Read and parse a JSON record, or `null` on miss. */
  getRecord<T>(key: string): Promise<T | null>;
  /** Delete a single record. */
  deleteRecord(key: string): Promise<void>;
  /** Store a raw string pointer (e.g. a secondary index value) verbatim. */
  putRaw(key: string, value: string, ttlMs: number): Promise<void>;
  /** Read a raw string pointer, or `null` on miss. */
  getRaw(key: string): Promise<string | null>;
  /** Add `id` to the one-to-many index at `indexKey` (deduped), setting TTL. */
  addToIndex(indexKey: string, id: string, ttlMs: number): Promise<void>;
  /** Read the id array at `indexKey` (empty array on miss). */
  readIndex(indexKey: string): Promise<string[]>;
  /** Delete the index at `indexKey`. */
  clearIndex(indexKey: string): Promise<void>;
}

export function createRedisRecordStore(cache: Cache): RedisRecordStore {
  const helper: CacheHelper = createCacheHelper(cache);

  return {
    async putRecord<T>(key: string, value: T, ttlMs: number): Promise<void> {
      await helper.setStrict(key, JSON.stringify(value), ttlMs);
    },

    async getRecord<T>(key: string): Promise<T | null> {
      const raw = await helper.getStrict<string>(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    },

    async deleteRecord(key: string): Promise<void> {
      await helper.delStrict(key);
    },

    async putRaw(key: string, value: string, ttlMs: number): Promise<void> {
      await helper.setStrict(key, value, ttlMs);
    },

    async getRaw(key: string): Promise<string | null> {
      return (await helper.getStrict<string>(key)) ?? null;
    },

    async addToIndex(
      indexKey: string,
      id: string,
      ttlMs: number,
    ): Promise<void> {
      const ids = (await helper.getStrict<string[]>(indexKey)) ?? [];
      await helper.setStrict(indexKey, [...new Set([...ids, id])], ttlMs);
    },

    async readIndex(indexKey: string): Promise<string[]> {
      return (await helper.getStrict<string[]>(indexKey)) ?? [];
    },

    async clearIndex(indexKey: string): Promise<void> {
      await helper.delStrict(indexKey);
    },
  };
}
