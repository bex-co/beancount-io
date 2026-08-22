import { buildSnapshotCacheKey, CoalescingLruCache } from "../snapshot-cache";

describe("CoalescingLruCache", () => {
  it("coalesces concurrent loads for the same key into one loader run", async () => {
    const cache = new CoalescingLruCache<string>(4);
    let runs = 0;
    let release!: (v: string) => void;
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });
    const loader = () => {
      runs = runs + 1;
      return gate;
    };

    const first = cache.getOrLoad("k", loader);
    const second = cache.getOrLoad("k", loader);
    release("value");

    await expect(first).resolves.toBe("value");
    await expect(second).resolves.toBe("value");
    expect(runs).toBe(1);
  });

  it("serves settled values from the cache without re-running the loader", async () => {
    const cache = new CoalescingLruCache<string>(4);
    const loader = jest.fn().mockResolvedValue("v1");

    await cache.getOrLoad("k", loader);
    const again = await cache.getOrLoad("k", () => Promise.resolve("v2"));

    expect(again).toBe("v1");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does NOT cache rejections — the next call retries", async () => {
    const cache = new CoalescingLruCache<string>(4);
    const failing = jest.fn().mockRejectedValue(new Error("parse failed"));

    await expect(cache.getOrLoad("k", failing)).rejects.toThrow("parse failed");
    await expect(
      cache.getOrLoad("k", () => Promise.resolve("recovered")),
    ).resolves.toBe("recovered");
    expect(cache.size).toBe(1);
  });

  it("evicts least-recently-USED beyond capacity (a hit refreshes recency)", async () => {
    const cache = new CoalescingLruCache<string>(2);
    const loads: string[] = [];
    const loaderFor = (key: string) => () => {
      loads.push(key);
      return Promise.resolve(`value:${key}`);
    };

    await cache.getOrLoad("a", loaderFor("a"));
    await cache.getOrLoad("b", loaderFor("b"));
    await cache.getOrLoad("a", loaderFor("a")); // refresh "a" → "b" is oldest
    await cache.getOrLoad("c", loaderFor("c")); // evicts "b"

    await cache.getOrLoad("a", loaderFor("a")); // still cached
    await cache.getOrLoad("b", loaderFor("b")); // evicted → reloads

    expect(loads).toEqual(["a", "b", "c", "b"]);
    expect(cache.size).toBe(2);
  });

  it("rejects a capacity below 1", () => {
    expect(() => new CoalescingLruCache(0)).toThrow();
  });
});

describe("buildSnapshotCacheKey", () => {
  const base = {
    files: { "main.bean": "2024-01-01 open Assets:Cash\n" },
    entryPoint: "main.bean",
    effectiveToday: "2026-08-01",
    repoPaths: undefined,
    applyTsPlugins: undefined,
    includeSourceDetails: undefined,
  };

  it("is stable for identical inputs and independent of file-key order", () => {
    const a = buildSnapshotCacheKey({
      ...base,
      files: { "a.bean": "A", "b.bean": "B" },
    });
    const b = buildSnapshotCacheKey({
      ...base,
      files: { "b.bean": "B", "a.bean": "A" },
    });
    expect(a).toBe(b);
  });

  it.each([
    [
      "file content",
      { files: { "main.bean": "2024-01-02 open Assets:Cash\n" } },
    ],
    ["file path", { files: { "other.bean": "2024-01-01 open Assets:Cash\n" } }],
    ["entry point", { entryPoint: "other.bean" }],
    ["effective today", { effectiveToday: "2026-08-02" }],
    ["repoPaths [] vs undefined", { repoPaths: [] as string[] }],
    ["repoPaths contents", { repoPaths: ["docs/x.pdf"] }],
    ["applyTsPlugins raw", { applyTsPlugins: false }],
    ["source details", { includeSourceDetails: true }],
  ])("changes when %s changes", (_label, override) => {
    expect(buildSnapshotCacheKey({ ...base, ...override })).not.toBe(
      buildSnapshotCacheKey(base),
    );
  });

  it("cannot confuse embedded NUL content with additional files", () => {
    const oneFile = buildSnapshotCacheKey({
      ...base,
      files: { "a.bean": "x\0b.bean\0y" },
    });
    const twoFiles = buildSnapshotCacheKey({
      ...base,
      files: { "a.bean": "x", "b.bean": "y" },
    });
    expect(oneFile).not.toBe(twoFiles);
  });
});
