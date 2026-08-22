import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import { createCache, type Cache } from "cache-manager";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { serialize, deserialize } from "./cache-codec";

let cacheInstance: Cache | null = null;
let keyvRedisStore: KeyvRedis<unknown> | null = null;

/**
 * Creates and validates a Redis cache connection.
 * Uses singleton pattern - returns existing cache if already created.
 * Thread-safe: uses async-lock to prevent race conditions during concurrent initialization.
 *
 * @param redisUri - Redis connection URI
 * @param namespace - Optional namespace for the cache (default: "models")
 * @returns Cache instance backed by Redis
 * @throws Error if connection validation fails, connection timeout (10s), or lock timeout (30s)
 */
export async function createRedisCache(
  redisUri: string,
  namespace = "backend-v2",
): Promise<Cache> {
  if (!redisUri) {
    throw new Error("Redis URI required: ensure 'config.redis.uri' is set");
  }

  // Return existing instance if already initialized
  if (cacheInstance) {
    return cacheInstance;
  }

  // Use lock to prevent concurrent initialization
  return lock.acquire(LOCK_KEYS.INFRA.INIT_REDIS, async () => {
    // Double-check after acquiring lock
    if (cacheInstance) {
      return cacheInstance;
    }

    // Create Redis store and Keyv instance
    keyvRedisStore = new KeyvRedis(redisUri, {
      connectionTimeout: 10000, // 10 seconds
    });
    const keyvStore = new Keyv({
      store: keyvRedisStore,
      namespace,
      // Preserve Date/Map/Set/BigInt across the Redis round-trip (see cache-codec).
      serialize,
      deserialize,
    });
    cacheInstance = createCache({ stores: [keyvStore] });

    // Validate connection with a simple operation
    try {
      const testKey = "__connection_test__";
      const testValue = "ok";

      await cacheInstance.set(testKey, testValue, 1000); // 1 second TTL
      const result = await cacheInstance.get(testKey);

      if (result !== testValue) {
        throw new Error("Redis connection test failed: value mismatch");
      }

      // Clean up test key
      await cacheInstance.del(testKey);
    } catch (error) {
      // Clean up on validation failure
      await closeRedisCache();

      throw new Error(
        `Redis connection validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return cacheInstance;
  });
}

/**
 * Closes the Redis cache connection and cleans up resources
 */
export async function closeRedisCache(): Promise<void> {
  if (keyvRedisStore) {
    await keyvRedisStore.disconnect();
    keyvRedisStore = null;
  }
  cacheInstance = null;
}
