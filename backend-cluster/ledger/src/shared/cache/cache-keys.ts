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
  },
} as const;
