import "reflect-metadata";
import { createRedisRecordStore } from "../redis-record-store";

function fakeCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe("createRedisRecordStore", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores records as JSON strings under the given key", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);
    const value = { a: 1, b: "two" };

    await store.putRecord("k:1", value, 30_000);

    expect(cache.set).toHaveBeenCalledWith("k:1", JSON.stringify(value), 30_000);
  });

  it("parses a stored record and returns null on a miss", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);

    cache.get.mockResolvedValueOnce(JSON.stringify({ a: 1 }));
    await expect(store.getRecord("k:1")).resolves.toEqual({ a: 1 });

    cache.get.mockResolvedValueOnce(null);
    await expect(store.getRecord("k:missing")).resolves.toBeNull();
  });

  it("deletes a record by key", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);

    await store.deleteRecord("k:1");

    expect(cache.del).toHaveBeenCalledWith("k:1");
  });

  it("appends to a one-to-many index without duplicating ids", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);
    cache.get.mockResolvedValueOnce(["a", "b"]);

    await store.addToIndex("idx:1", "b", 60_000);

    expect(cache.set).toHaveBeenCalledWith("idx:1", ["a", "b"], 60_000);
  });

  it("seeds a new index array on first write", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);
    cache.get.mockResolvedValueOnce(null);

    await store.addToIndex("idx:1", "a", 60_000);

    expect(cache.set).toHaveBeenCalledWith("idx:1", ["a"], 60_000);
  });

  it("reads an index as an array, defaulting to empty", async () => {
    const cache = fakeCache();
    const store = createRedisRecordStore(cache);

    cache.get.mockResolvedValueOnce(["a", "b"]);
    await expect(store.readIndex("idx:1")).resolves.toEqual(["a", "b"]);

    cache.get.mockResolvedValueOnce(null);
    await expect(store.readIndex("idx:missing")).resolves.toEqual([]);
  });

  it("rethrows on a cache failure instead of failing open", async () => {
    const cache = fakeCache();
    cache.set.mockRejectedValueOnce(new Error("redis down"));
    const store = createRedisRecordStore(cache);

    await expect(store.putRecord("k:1", { a: 1 }, 1000)).rejects.toThrow(
      "redis down",
    );
  });
});
