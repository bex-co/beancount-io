import { type Cache } from "cache-manager";
import { lock } from "@/shared/lock";
import { logger } from "@/shared/logger";

const cacheLogger = logger.child({ module: "cache-helper" });

/**
 * Lock-key prefix used to serialize concurrent `getOrSet` loads for the same
 * cache key (stampede protection). Kept distinct from `LOCK_KEYS` namespaces.
 */
const CACHE_LOCK_PREFIX = "cache:get-or-set:";

/**
 * Thin, application-level wrapper around the shared `cache-manager` Cache.
 *
 * Responsibilities:
 * - A single typed surface (`get` / `set` / `del` / `getOrSet`) for all
 *   service-layer caching, so call sites stop touching `service.cache` directly.
 * - Read-through caching via `getOrSet`, guarded against cache stampede.
 * - Fail-open semantics (default): a Redis error never breaks a request. Reads
 *   fall back to a miss; `getOrSet` falls back to running the loader; writes are
 *   logged and swallowed. Use these for genuine caches.
 * - Strict variants (`getStrict` / `setStrict` / `delStrict`): log the error and
 *   **rethrow** instead of failing open. Use for ephemeral persistence stores
 *   (e.g. auth tokens) where a dropped write must surface to the caller.
 *
 * Serialization is handled by the underlying Keyv store, which is configured with
 * a superjson codec (see `service/redis/cache-codec.ts`). Values therefore round-trip
 * with their types intact — `Date`, `Map`, `Set`, and `BigInt` survive a cache
 * read/write, so callers need not rehydrate them by hand.
 */
export interface CacheHelper {
  /** Get a cached value, or `undefined` on miss or cache error. */
  get<T>(key: string): Promise<T | undefined>;
  /** Set a cached value with a TTL in milliseconds. Errors are swallowed. */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  /** Delete a single cached key. Errors are swallowed. */
  del(key: string): Promise<void>;
  /**
   * Return the cached value for `key`, or run `loader`, cache its result for
   * `ttlMs`, and return it. Concurrent calls for the same key are serialized so
   * the loader runs once (stampede protection). Fails open: if the cache is
   * unavailable the loader still runs and its result is returned.
   */
  getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T>;

  /**
   * Strict variant of {@link get}: logs the error and **rethrows** instead of
   * failing open. Use for ephemeral persistence stores (e.g. auth tokens) where
   * a Redis error must propagate to the caller rather than degrade silently.
   */
  getStrict<T>(key: string): Promise<T | undefined>;
  /** Strict variant of {@link set}: logs the error and rethrows. */
  setStrict<T>(key: string, value: T, ttlMs: number): Promise<void>;
  /** Strict variant of {@link del}: logs the error and rethrows. */
  delStrict(key: string): Promise<void>;
}

/**
 * Creates a {@link CacheHelper} backed by the given `cache-manager` Cache.
 *
 * @param cache - The shared Redis-backed cache (see `createRedisCache`).
 */
export function createCacheHelper(cache: Cache): CacheHelper {
  async function get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await cache.get<T>(key);
      return value ?? undefined;
    } catch (error) {
      cacheLogger.warn("Cache get failed; treating as miss", { key, error });
      return undefined;
    }
  }

  async function set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await cache.set(key, value, ttlMs);
    } catch (error) {
      cacheLogger.warn("Cache set failed; value not cached", { key, error });
    }
  }

  async function del(key: string): Promise<void> {
    try {
      await cache.del(key);
    } catch (error) {
      cacheLogger.warn("Cache del failed", { key, error });
    }
  }

  async function getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Serialize concurrent loads for the same key so the loader runs once.
    return lock.acquire(`${CACHE_LOCK_PREFIX}${key}`, async () => {
      // Double-check: another waiter may have populated the cache.
      const recheck = await get<T>(key);
      if (recheck !== undefined) {
        return recheck;
      }

      const value = await loader();
      await set(key, value, ttlMs);
      return value;
    });
  }

  async function getStrict<T>(key: string): Promise<T | undefined> {
    try {
      const value = await cache.get<T>(key);
      return value ?? undefined;
    } catch (error) {
      cacheLogger.error("Cache get failed (strict)", { key, error });
      throw error;
    }
  }

  async function setStrict<T>(
    key: string,
    value: T,
    ttlMs: number,
  ): Promise<void> {
    try {
      await cache.set(key, value, ttlMs);
    } catch (error) {
      cacheLogger.error("Cache set failed (strict)", { key, error });
      throw error;
    }
  }

  async function delStrict(key: string): Promise<void> {
    try {
      await cache.del(key);
    } catch (error) {
      cacheLogger.error("Cache del failed (strict)", { key, error });
      throw error;
    }
  }

  return { get, set, del, getOrSet, getStrict, setStrict, delStrict };
}
