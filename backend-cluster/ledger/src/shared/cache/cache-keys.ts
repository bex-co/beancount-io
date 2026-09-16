/**
 * Centralized cache key registry for consistent namespacing and collision
 * prevention.
 *
 * Pattern: `domain:resource:identifier[:sub]`
 * - domain: Feature or area (ledger, ...)
 * - resource: The kind of value cached (status, profile, xml, ...)
 * - identifier/sub: Optional scoping values (userId, locale, ...)
 *
 * Benefits:
 * - Prevents key collisions through consistent namespacing
 * - Type-safe key generation
 * - Single place to audit every cache key in use
 *
 * Note: keys here are namespaced again by Keyv at the
 * Redis layer, so these strings are the logical key within that namespace.
 *
 * @example
 * import { CACHE_KEYS } from "@/shared/cache";
 * const key = CACHE_KEYS.feed.bySourceLocale("blog", "en");
 */
export const CACHE_KEYS = {
  /**
   * Ledger feature caches.
   */
  ledger: {
    /**
     * A ledger repo's loaded `.bean` FileMap, keyed by the repo's HEAD commit
     * SHA (git content-addressing). Because the key embeds the commit SHA, a
     * push moves the SHA → a new key → an automatic cache miss → a fresh fetch;
     * no push/invalidation webhook is needed and superseded entries age out by
     * TTL. The entry point is deliberately NOT part of the key: the loader
     * fetches the repo's whole `.bean` tree regardless of entry point, so the
     * cached value is a pure function of the commit — one entry per commit,
     * shared by every entry point (validated post-retrieval). See
     * `foundation/clients/load-cached-ledger-file-map.ts`.
     */
    fileMapBySha: (owner: string, repo: string, sha: string) =>
      `ledger:file_map_v2:${owner}:${repo}:${sha}`,
    /**
     * Pointer to the SHA whose FileMap is currently cached for a repo. When HEAD
     * moves, the loader deletes the superseded `fileMapBySha` entry so the cache
     * holds ~one full copy per repo (not one per commit) — bounding memory
     * without an eviction policy (this Redis is authoritative for auth tokens).
     */
    fileMapHeadSha: (owner: string, repo: string) =>
      `ledger:file_map_head_v2:${owner}:${repo}`,
    /**
     * One validated revision of a managed price feed (ADR 015 section 5): the
     * exact bytes plus what validation learned about them. Immutable per
     * `(url, revision)`; the head pointer below decides which one is current.
     */
    priceFeedBlob: (urlHash: string, revision: string) =>
      `ledger:price_feed_blob_v1:${urlHash}:${revision}`,
    /**
     * The mutable pointer for a managed price feed: current revision, ETag,
     * fetch time, the next refresh time, and the last failure. Refresh is
     * decided by the `nextRefreshAt` INSIDE this value, never by the key's
     * TTL, so an outage cannot make the last good revision unreachable.
     */
    priceFeedHead: (urlHash: string) => `ledger:price_feed_head_v1:${urlHash}`,
  },
} as const;
