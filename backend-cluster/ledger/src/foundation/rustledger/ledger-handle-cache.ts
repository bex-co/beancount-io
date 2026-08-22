/**
 * LRU of LIVE WASM `Ledger` handles for the BQL path, with pin-protected
 * lifetimes and in-flight coalescing.
 *
 * Why this exists: every BQL query used to re-run `Ledger.fromFiles` — a
 * synchronous main-thread WASM parse — even for back-to-back queries on the
 * same content (`queryShell` is reachable unauthenticated for public ledgers,
 * and the AI paths issue several queries per request). The snapshot cache
 * can't help here: a query needs the live WASM object, not the materialized
 * JSON. So we keep a few parsed ledgers ALIVE and reuse them.
 *
 * Owning live WASM objects (each holds linear memory until `.free()`) makes
 * eviction dangerous: a joiner that `await`ed a shared load can be scheduled
 * AFTER another task already evicted-and-freed the entry, and calling into a
 * freed ledger aborts the process. The pin protocol closes that gap:
 *
 *  - `acquire` pins the entry (sync with its liveness check — no interleaving
 *    point between check and pin in single-threaded JS);
 *  - eviction only frees when `pins === 0`, otherwise it marks `evicted` and
 *    the LAST `release` frees;
 *  - a joiner that finds its entry already freed loops and re-creates.
 *
 * Rejected loads are never cached. `V` is generic over `{ free(): void }` so
 * the protocol is unit-testable without the WASM.
 */

interface Freeable {
  free(): void;
}

interface Entry<V extends Freeable> {
  readonly ledger: V;
  pins: number;
  evicted: boolean;
  freed: boolean;
}

export class LedgerHandleCache<V extends Freeable> {
  /** Insertion-ordered; oldest entry is the first key. */
  private readonly entries = new Map<string, Entry<V>>();
  private readonly inflight = new Map<string, Promise<Entry<V>>>();

  constructor(private readonly maxEntries: number) {
    if (maxEntries < 1) {
      throw new Error(`maxEntries must be >= 1 (got ${maxEntries})`);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  /** Acquire (pin) the entry for `key`, creating the ledger if needed. */
  async acquire(key: string, create: () => Promise<V>): Promise<Entry<V>> {
    for (;;) {
      const hit = this.entries.get(key);
      if (hit) {
        // Refresh recency.
        this.entries.delete(key);
        this.entries.set(key, hit);
        hit.pins = hit.pins + 1;
        return hit;
      }

      let pending = this.inflight.get(key);
      if (!pending) {
        pending = create().then((ledger) => {
          const entry: Entry<V> = {
            ledger,
            pins: 0,
            evicted: false,
            freed: false,
          };
          this.entries.set(key, entry);
          this.evictOverflow();
          return entry;
        });
        this.inflight.set(key, pending);
        const cleanup = () => {
          this.inflight.delete(key);
        };
        pending.then(cleanup, cleanup);
      }

      const entry = await pending;
      // Everything from here to the return is synchronous, so the freed-check
      // and the pin cannot be interleaved by an eviction.
      if (entry.freed) {
        continue; // evicted+freed while we awaited — re-create
      }
      entry.pins = entry.pins + 1;
      return entry;
    }
  }

  /** Unpin; frees the ledger if it was evicted and this was the last pin. */
  release(entry: Entry<V>): void {
    entry.pins = entry.pins - 1;
    if (entry.pins === 0 && entry.evicted && !entry.freed) {
      entry.freed = true;
      entry.ledger.free();
    }
  }

  /** Run `fn` against the (cached or freshly created) ledger for `key`. */
  async withLedger<T>(
    key: string,
    create: () => Promise<V>,
    fn: (ledger: V) => T,
  ): Promise<T> {
    const entry = await this.acquire(key, create);
    try {
      return fn(entry.ledger);
    } finally {
      this.release(entry);
    }
  }

  /** Evict + free everything not currently pinned (pinned free on release). */
  clear(): void {
    for (const [key, entry] of this.entries) {
      this.entries.delete(key);
      entry.evicted = true;
      if (entry.pins === 0 && !entry.freed) {
        entry.freed = true;
        entry.ledger.free();
      }
    }
    this.inflight.clear();
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      const entry = this.entries.get(oldest) as Entry<V>;
      this.entries.delete(oldest);
      entry.evicted = true;
      if (entry.pins === 0 && !entry.freed) {
        entry.freed = true;
        entry.ledger.free();
      }
    }
  }
}
