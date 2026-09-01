import type { FileMap } from "@rustledger/wasm";
import {
  collectSourceFiles,
  DEFAULT_ENTRY_POINT,
  fetchBeanFileMap,
  ledgerFileMapPayloadBytes,
  loadLedgerFileMap,
  requireEntryPoint,
  type GiteaReposContentClient,
  type LoadedLedger,
  type LoadLedgerOptions,
} from "@/foundation/rustledger";
import { CACHE_KEYS, TTL, type CacheHelper } from "@/shared/cache";
import { logger } from "@/shared/logger";
import { lock } from "@/shared/lock";

const log = logger.child({ module: "cached-file-map" });
const FILE_MAP_HEAD_LOCK_PREFIX = "cache:file-map-head:";
/** Keep Redis serialization/deserialization off the event loop for large books. */
const MAX_CACHED_FILE_MAP_BYTES = 4 * 1024 * 1024;

/**
 * Redis cache for a ledger's loaded `.bean` FileMap, keyed by the repo's HEAD
 * commit SHA. This is the in-process replacement for the deleted Python fava
 * service's `LRUCache[FavaLedger]`.
 *
 * Why SHA-keyed instead of a push webhook: git is content-addressed, so a push
 * moves the HEAD SHA. Embedding that SHA in the cache key means a push yields a
 * *different* key → an automatic miss → a fresh fetch, and the superseded
 * entry ages out by TTL. No `repo-push` invalidation webhook is required — the
 * commit SHA *is* the invalidation signal (cleaner than fava's mtime/LRU +
 * push-webhook pairing).
 *
 * The cached value is the FileMap alone — NOT the entry point. The fetch pulls
 * the repo's whole `.bean` tree regardless of entry point, so the payload is a
 * pure function of the commit; keying on the entry point too would store
 * byte-identical FileMaps under distinct keys. The entry point is validated
 * in-memory after retrieval instead (`requireEntryPoint`), preserving the
 * loader's NotFoundError semantics. A corollary: a load with a *missing* entry
 * point still caches the fetched FileMap (correctly — other entry points can
 * serve from it) before the error propagates.
 *
 * HEAD-SHA resolution is coalesced per client instance: concurrent loads for
 * the same repo through the same client (e.g. parallel GraphQL resolvers of
 * one dashboard query) share a single in-flight `repoGetAllCommits` call. The
 * memo is in-flight-only (dropped as soon as it settles), so it introduces no
 * staleness window. Scoping it to the client instance — rather than globally
 * per repo — is what keeps it access-safe: the Gitea client factory memoizes
 * client instances per credential, so same-credential callers coalesce while
 * distinct credentials never share a resolution.
 *
 * Access safety: the SHA is resolved with the SAME user-scoped client used for
 * the load, so an unauthorized caller cannot resolve the SHA for a private repo
 * and therefore cannot construct the cache key; and if resolution is skipped
 * (see below), the fallback load uses that same client. The cache never widens
 * who can read a repo.
 */

/** The extra Gitea method the cached loader needs beyond {@link GiteaClientLike}. */
interface GiteaCommitReposClient extends GiteaReposContentClient {
  repoGetAllCommits(
    owner: string,
    repo: string,
    query?: {
      sha?: string;
      limit?: number;
      page?: number;
      stat?: boolean;
      verification?: boolean;
      files?: boolean;
    },
  ): Promise<{ data?: Array<{ sha?: string }> }>;
}

/** A Gitea client that can both read contents and resolve the HEAD commit SHA. */
export interface GiteaCommitClient {
  repos: GiteaCommitReposClient;
}

/**
 * Resolve a repo's current HEAD commit SHA with a single lightweight Gitea call
 * (the `stat`/`verification`/`files` payloads are disabled for speed, and only
 * one commit is requested).
 *
 * Returns `null` — rather than throwing — when the SHA can't be resolved (e.g.
 * an empty repo, or a transient error) so the caller falls back to an uncached
 * live load. An access error surfaces on that fallback load instead, so
 * swallowing it here never grants access.
 */
async function resolveHeadSha(
  client: GiteaCommitClient,
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const res = await client.repos.repoGetAllCommits(owner, repo, {
      sha: "HEAD",
      limit: 1,
      stat: false,
      verification: false,
      files: false,
    });
    return res.data?.[0]?.sha ?? null;
  } catch (error) {
    log.debug("HEAD SHA resolution failed; loading uncached", {
      owner,
      repo,
      error,
    });
    return null;
  }
}

/**
 * In-flight HEAD-SHA resolutions, keyed by client instance → `owner/repo`.
 * Entries are removed the moment the promise settles (coalescing only, never a
 * cache — a settled SHA is re-resolved on the next call, so no staleness).
 */
const inflightHeadShas = new WeakMap<
  GiteaCommitClient,
  Map<string, Promise<string | null>>
>();

/**
 * Resolve a repo's HEAD to a commit SHA, coalescing concurrent callers.
 *
 * Exported so a caller that needs to report *which* commit a derived number was
 * computed from gets the same SHA the FileMap cache keyed on, rather than
 * resolving HEAD a second time and risking a different answer.
 */
export function resolveHeadShaCoalesced(
  client: GiteaCommitClient,
  owner: string,
  repo: string,
): Promise<string | null> {
  let inflight = inflightHeadShas.get(client);
  if (!inflight) {
    inflight = new Map();
    inflightHeadShas.set(client, inflight);
  }
  const repoKey = `${owner}/${repo}`;
  const existing = inflight.get(repoKey);
  if (existing) {
    return existing;
  }
  const resolution = resolveHeadSha(client, owner, repo);
  inflight.set(repoKey, resolution);
  // `resolveHeadSha` never rejects (it catches → null), so this cleanup
  // callback is the only continuation needed.
  void resolution.finally(() => inflight.delete(repoKey));
  return resolution;
}

/**
 * Load a ledger repo's FileMap through the SHA-keyed Redis cache. On a cache
 * hit this serves the FileMap without any tree/contents round-trips (the single
 * commit lookup — shared across concurrent same-client loads — is the only
 * Gitea call); on a miss it fetches via {@link fetchBeanFileMap}, pinned to the
 * resolved SHA so the tree and file reads observe one consistent commit.
 *
 * The cached value (a plain `path → contents` record) round-trips through the
 * cache codec unchanged. `getOrSet` is read-through, stampede-guarded, and
 * fails open — a Redis outage runs the loader instead of breaking the request.
 * The entry point is validated after retrieval; a missing one throws
 * NotFoundError (same semantics as {@link loadLedgerFileMap}) without
 * invalidating the cached FileMap.
 */
export async function loadCachedFileMapForRepo(
  client: GiteaCommitClient,
  cacheHelper: CacheHelper,
  owner: string,
  repo: string,
  options: LoadLedgerOptions = {},
): Promise<LoadedLedger> {
  const entryPoint = options.entryPoint ?? DEFAULT_ENTRY_POINT;

  // A caller that already pinned a concrete ref has a content address; otherwise
  // resolve HEAD to one so the cache key is stable per commit.
  //
  // ⚠️ ACCESS-CHECK CAVEAT (internal-only branch): on the HEAD path the
  // caller's OWN client resolves the SHA, so a cache hit still implies the
  // caller could read the repo. On the pinned-ref path a cache HIT is served
  // without ever touching the caller's client — no access check runs. Every
  // current call site passes no ref; if you add one where `ref` derives from
  // caller input, you MUST verify repo access first (e.g. resolve HEAD with
  // the caller's client and discard the result).
  const sha =
    options.ref && options.ref !== "HEAD"
      ? options.ref
      : await resolveHeadShaCoalesced(client, owner, repo);

  if (!sha) {
    return loadLedgerFileMap(client, owner, repo, { ...options, entryPoint });
  }

  // Evict this repo's SUPERSEDED FileMap before caching the current one, so the
  // cache holds ~one full copy per repo instead of one per commit — a bound
  // that does NOT rely on Redis eviction. This cache lives on the dedicated
  // CACHE Redis (`config.redis.cacheUri`, evictable/capped in prod), but
  // `cacheUri` defaults to the authoritative auth Redis (`noeviction`) in a
  // single-Redis deployment — and even with `allkeys-lru`, bounding our own
  // footprint is deliberate. Best-effort + fail-open: a stale pointer or
  // failed delete only leaves an extra copy to age out by TTL.
  if (!options.ref || options.ref === "HEAD") {
    await evictSupersededFileMap(client, cacheHelper, owner, repo, sha);
  }

  const { files, repoPaths } = await cacheHelper.getOrSet<{
    files: FileMap;
    repoPaths: string[];
  }>(
    CACHE_KEYS.ledger.fileMapBySha(owner, repo, sha),
    // Keyed by an immutable commit SHA, so correctness is push-driven, not
    // TTL-driven; the TTL only bounds how long a superseded commit's full copy
    // lingers in Redis. Kept short (2h) — combined with superseded-SHA eviction
    // above — so a commit-and-read loop can't pile up full ledger copies.
    TTL.HOUR_2,
    () => fetchBeanFileMap(client, owner, repo, sha),
    (value) =>
      ledgerFileMapPayloadBytes(value.files, value.repoPaths) <=
      MAX_CACHED_FILE_MAP_BYTES,
  );
  requireEntryPoint(files, owner, repo, entryPoint);
  const sourceFiles = collectSourceFiles(files, entryPoint);
  return { files, entryPoint, sourceFiles, repoPaths };
}

/**
 * When a repo's HEAD SHA changes, delete the previously-cached FileMap for that
 * repo and repoint the head marker to the new SHA. Bounds the cache to ~one full
 * copy per repo. Fail-open: any cache error is swallowed (the helper's non-strict
 * ops already log + swallow), so this never blocks a load.
 */
async function evictSupersededFileMap(
  client: GiteaCommitClient,
  cacheHelper: CacheHelper,
  owner: string,
  repo: string,
  sha: string,
): Promise<void> {
  await lock.acquire(
    `${FILE_MAP_HEAD_LOCK_PREFIX}${owner}/${repo}`,
    async () => {
      const headKey = CACHE_KEYS.ledger.fileMapHeadSha(owner, repo);
      const previousSha = await cacheHelper.get<string>(headKey);
      if (previousSha === sha) return;

      if (previousSha !== undefined) {
        // A slow read of old SHA A can finish after a push and a fast read of
        // new SHA B. Re-resolve HEAD inside the serialized pointer update; if A
        // is stale, it may populate A's immutable cache key for its own caller
        // but must not evict B or repoint the repo marker backward.
        const currentHead = await resolveHeadSha(client, owner, repo);
        if (currentHead !== sha) return;
        await cacheHelper.del(
          CACHE_KEYS.ledger.fileMapBySha(owner, repo, previousSha),
        );
      }
      // The pointer outlives the FileMap TTL so a later HEAD move still finds
      // the superseded SHA to delete.
      await cacheHelper.set(headKey, sha, TTL.HOUR_24);
    },
  );
}
