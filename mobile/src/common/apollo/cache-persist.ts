import AsyncStorage from "@react-native-async-storage/async-storage";
import { CachePersistor, AsyncStorageWrapper } from "apollo3-cache-persist";

import { cache } from "@/common/apollo/cache";
import { getServerUrl } from "@/common/vars/server-url";

/** Storage key — exported so purge tests can assert the key is gone. */
const APOLLO_CACHE_PERSIST_KEY = "apollo-cache-persist";

/**
 * Explicit size cap (1 MiB). Unbounded persistence of a large ledger is a
 * footgun; Android AsyncStorage also rejects reads past ~2 MiB per key.
 */
const APOLLO_CACHE_MAX_SIZE = 1024 * 1024;

type ScopedCacheEnvelope = {
  serverUrl: string;
  cache: string;
};

/**
 * Apollo uses one fixed persistence key. Wrap its payload with the server that
 * created it so a stale cache is never restored after the user selects another
 * deployment. Older unscoped payloads are intentionally ignored once.
 */
class ServerScopedAsyncStorage extends AsyncStorageWrapper {
  async getItem(key: string): Promise<string | null> {
    const stored = await super.getItem(key);
    if (!stored) {
      return null;
    }
    try {
      const parsed = JSON.parse(stored) as Partial<ScopedCacheEnvelope>;
      return parsed.serverUrl === getServerUrl() &&
        typeof parsed.cache === "string"
        ? parsed.cache
        : null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await super.setItem(key, null);
      return;
    }
    await super.setItem(
      key,
      JSON.stringify({ serverUrl: getServerUrl(), cache: value }),
    );
  }
}

const cachePersistor = new CachePersistor({
  cache,
  storage: new ServerScopedAsyncStorage(AsyncStorage),
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
