import { createCache } from "cache-manager";
import { createCacheHelper, type CacheHelper } from "@/shared/cache";

/**
 * Process-wide CacheHelper for the SHA-keyed FileMap cache.
 *
 * Default: cache-manager's in-memory Keyv store — the same locality profile as
 * the Python service's in-process `LRUCache[FavaLedger]`, but self-invalidating
 * (keys embed the repo HEAD SHA, so a push is an automatic miss; no repo-push
 * webhook needed). A Redis-backed store can be swapped in here for horizontal
 * scaling without touching any caller (w1/005 decides for production).
 */
let helper: CacheHelper | undefined;

export function getCacheHelper(): CacheHelper {
  if (!helper) {
    helper = createCacheHelper(createCache());
  }
  return helper;
}
