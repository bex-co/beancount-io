import { createHash } from "crypto";
import type { FileMap } from "@rustledger/wasm";

/**
 * In-process async LRU with in-flight coalescing.
 *
 * Purpose-built for the parsed-ledger snapshot cache: `Ledger.fromFiles` is a
 * SYNCHRONOUS WASM parse on the Node main thread (~100ms+ for a 1 MB ledger),
 * and a single dashboard screen fans out to many resolvers that each re-parse
 * the same commit. Coalescing collapses concurrent same-key loads into one
 * parse; the LRU serves the settled value to later requests.
 *
 * Semantics:
 * - `getOrLoad` returns the cached value, joins an in-flight load, or runs
 *   `loader` — exactly one loader runs per key at a time.
 * - Rejections are NEVER cached: a failed load is dropped and the next call
 *   retries. (The rejection still propagates to every joined caller.)
 * - Eviction is least-recently-USED (a cache hit refreshes recency), bounded
 *   by `maxEntries` values — memory is bounded by entry count, not bytes, so
 *   size the capacity for the largest values you expect to hold.
 */
export class CoalescingLruCache<V> {
  /** Insertion-ordered; oldest entry is the first key. */
  private readonly entries = new Map<string, V>();
  private readonly inflight = new Map<string, Promise<V>>();

  constructor(private readonly maxEntries: number) {
    if (maxEntries < 1) {
      throw new Error(`maxEntries must be >= 1 (got ${maxEntries})`);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  async getOrLoad(key: string, loader: () => Promise<V>): Promise<V> {
    if (this.entries.has(key)) {
      const hit = this.entries.get(key) as V;
      // Re-insert to refresh recency (Map preserves insertion order).
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit;
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending;
    }

    const load = loader().then((value) => {
      this.entries.set(key, value);
      while (this.entries.size > this.maxEntries) {
        const oldest = this.entries.keys().next().value;
        if (oldest === undefined) break;
        this.entries.delete(oldest);
      }
      return value;
    });
    this.inflight.set(key, load);
    // Settle-time cleanup on BOTH paths; the two-arg then never leaves an
    // unhandled rejection behind (callers get theirs from `load` itself).
    const cleanup = () => {
      this.inflight.delete(key);
    };
    load.then(cleanup, cleanup);
    return load;
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }
}

/**
 * Content-addressed cache key for a parsed-ledger snapshot. Covers EVERY input
 * that can change `parseLedgerFiles` output:
 *
 * - the full file map (paths + contents, order-independent),
 * - the entry point,
 * - the effective "today" (TS plugins like amortize_over drop future-dated
 *   copies, and WASM-native plugins may read the clock — keying on the
 *   resolved day makes midnight rollover a cache miss, never a stale hit),
 * - the repo blob inventory (document-existence reconciliation), with
 *   `undefined` distinguished from `[]`,
 * - the applyTsPlugins switch.
 *
 * Hashing is sha256 over byte-length-prefixed fields — ~1ms/MB, noise next to
 * the parse it saves. Length prefixes are required because ledger source may
 * contain NUL; a delimiter alone lets one file's content impersonate multiple
 * `(path, content)` fields and collide across tenants.
 */
export function buildSnapshotCacheKey(params: {
  files: FileMap;
  entryPoint: string;
  effectiveToday: string;
  repoPaths: string[] | undefined;
  applyTsPlugins: boolean | undefined;
  includeSourceDetails?: boolean;
}): string {
  const {
    files,
    entryPoint,
    effectiveToday,
    repoPaths,
    applyTsPlugins,
    includeSourceDetails,
  } = params;
  const hash = createHash("sha256");
  const field = (value: string) => {
    hash.update(String(Buffer.byteLength(value, "utf8")));
    hash.update(":");
    hash.update(value);
  };

  field(entryPoint);
  field(effectiveToday);
  field(applyTsPlugins === false ? "raw" : "auto");
  field(includeSourceDetails === true ? "source-details" : "no-source-details");
  field(repoPaths ? "paths" : "no-paths");
  for (const path of [...(repoPaths ?? [])].sort()) {
    field(path);
  }
  field("::files::");
  for (const path of Object.keys(files).sort()) {
    field(path);
    field(files[path]);
  }
  return hash.digest("hex");
}
