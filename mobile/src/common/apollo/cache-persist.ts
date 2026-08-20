import AsyncStorage from "@react-native-async-storage/async-storage";
import { CachePersistor, AsyncStorageWrapper } from "apollo3-cache-persist";

import { cache } from "@/common/apollo/cache";

/** Storage key — exported so purge tests can assert the key is gone. */
export const APOLLO_CACHE_PERSIST_KEY = "apollo-cache-persist";

/**
 * Explicit size cap (1 MiB). Unbounded persistence of a large ledger is a
 * footgun; Android AsyncStorage also rejects reads past ~2 MiB per key.
 */
export const APOLLO_CACHE_MAX_SIZE = 1024 * 1024;

export const cachePersistor = new CachePersistor({
  cache,
  storage: new AsyncStorageWrapper(AsyncStorage),
  key: APOLLO_CACHE_PERSIST_KEY,
  maxSize: APOLLO_CACHE_MAX_SIZE,
  trigger: "write",
});

let restorePromise: Promise<void> | null = null;

/**
 * Hydrate the in-memory cache from AsyncStorage. Idempotent — concurrent
 * callers share one restore so the splash gate and any late await cannot race.
 * Must finish before the first query mounts (SplashProvider awaits this).
 */
export function restoreApolloCache(): Promise<void> {
  if (!restorePromise) {
    restorePromise = cachePersistor.restore();
  }
  return restorePromise;
}

/** Wipe disk + leave the in-memory cache empty. Pair with `client.clearStore()`. */
export function purgeApolloCache(): Promise<void> {
  return cachePersistor.purge();
}
