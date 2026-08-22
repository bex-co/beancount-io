import { LedgerHandleCache } from "../ledger-handle-cache";

/** A fake WASM ledger that records whether it was freed. */
function fakeLedger(id: string): { id: string; freed: boolean; free(): void } {
  return {
    id,
    freed: false,
    free() {
      if (this.freed) throw new Error(`double free of ${this.id}`);
      this.freed = true;
    },
  };
}

type Fake = ReturnType<typeof fakeLedger>;

describe("LedgerHandleCache", () => {
  it("coalesces concurrent creates for one key and reuses the live ledger", async () => {
    const cache = new LedgerHandleCache<Fake>(4);
    let creates = 0;
    const create = async () => {
      creates = creates + 1;
      return fakeLedger("a");
    };

    const [x, y] = await Promise.all([
      cache.withLedger("k", create, (l) => l.id),
      cache.withLedger("k", create, (l) => l.id),
    ]);
    const z = await cache.withLedger("k", create, (l) => l.id);

    expect([x, y, z]).toEqual(["a", "a", "a"]);
    expect(creates).toBe(1);
    expect(cache.size).toBe(1);
  });

  it("frees an unpinned entry on LRU overflow, never a live one mid-use", async () => {
    const cache = new LedgerHandleCache<Fake>(1);
    const a = fakeLedger("a");
    const b = fakeLedger("b");

    await cache.withLedger(
      "a",
      async () => a,
      (l) => l.id,
    );
    await cache.withLedger(
      "b",
      async () => b,
      (l) => l.id,
    );

    expect(a.freed).toBe(true); // evicted by "b"
    expect(b.freed).toBe(false); // still cached
    expect(cache.size).toBe(1);
  });

  it("defers freeing a PINNED entry until its last release", async () => {
    const cache = new LedgerHandleCache<Fake>(1);
    const a = fakeLedger("a");
    const b = fakeLedger("b");

    const entryA = await cache.acquire("a", async () => a);
    // While "a" is pinned, loading "b" evicts it — but must NOT free it.
    await cache.withLedger(
      "b",
      async () => b,
      (l) => l.id,
    );
    expect(a.freed).toBe(false);

    cache.release(entryA);
    expect(a.freed).toBe(true); // last pin released → freed
    expect(b.freed).toBe(false);
  });

  it("re-creates when a joiner finds its entry already freed", async () => {
    const cache = new LedgerHandleCache<Fake>(1);
    let creates = 0;
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const slowCreateA = async () => {
      creates = creates + 1;
      await gate;
      return fakeLedger(`a${creates}`);
    };

    // Two concurrent acquires join the same in-flight create of "a".
    const first = cache.acquire("a", slowCreateA);
    const second = cache.acquire("a", slowCreateA);
    releaseGate();
    const entry1 = await first;
    // First joiner pins, uses, releases — then "b" evicts and FREES "a"
    // (pins are zero) before the second joiner's continuation runs.
    cache.release(entry1);
    await cache.withLedger(
      "b",
      async () => fakeLedger("b"),
      (l) => l.id,
    );

    const entry2 = await second;
    expect(entry2.ledger.freed).toBe(false); // got a live ledger, not the freed one
    cache.release(entry2);
    expect(creates).toBeGreaterThanOrEqual(1);
  });

  it("does not cache a rejected create; the next call retries", async () => {
    const cache = new LedgerHandleCache<Fake>(2);
    await expect(
      cache.withLedger(
        "k",
        async () => {
          throw new Error("parse failed");
        },
        (l: Fake) => l.id,
      ),
    ).rejects.toThrow("parse failed");

    const ok = await cache.withLedger(
      "k",
      async () => fakeLedger("ok"),
      (l) => l.id,
    );
    expect(ok).toBe("ok");
  });

  it("clear() frees unpinned entries and defers pinned ones to release", async () => {
    const cache = new LedgerHandleCache<Fake>(4);
    const a = fakeLedger("a");
    const b = fakeLedger("b");
    await cache.withLedger(
      "a",
      async () => a,
      (l) => l.id,
    );
    const entryB = await cache.acquire("b", async () => b);

    cache.clear();
    expect(a.freed).toBe(true);
    expect(b.freed).toBe(false); // pinned

    cache.release(entryB);
    expect(b.freed).toBe(true);
    expect(cache.size).toBe(0);
  });
});
