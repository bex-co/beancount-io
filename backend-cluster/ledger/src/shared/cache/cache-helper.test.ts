import { type Cache } from "cache-manager";

jest.mock("@/shared/lock");

import { lock } from "@/shared/lock";
import { createCacheHelper, type CacheHelper } from "./cache-helper";

const mockLock = lock as jest.Mocked<typeof lock>;

describe("cache-helper", () => {
  let mockCache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let helper: CacheHelper;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    // By default, lock.acquire immediately runs the callback.
    mockLock.acquire = jest
      .fn()
      .mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());

    helper = createCacheHelper(mockCache as unknown as Cache);
  });

  describe("get", () => {
    it("returns the cached value on hit", async () => {
      mockCache.get.mockResolvedValue({ a: 1 });

      await expect(helper.get<{ a: number }>("k")).resolves.toEqual({ a: 1 });
      expect(mockCache.get).toHaveBeenCalledWith("k");
    });

    it("returns undefined on miss (null from cache)", async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(helper.get("k")).resolves.toBeUndefined();
    });

    it("fails open and returns undefined when the cache throws", async () => {
      mockCache.get.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(helper.get("k")).resolves.toBeUndefined();
    });
  });

  describe("set", () => {
    it("passes the TTL through to the underlying cache", async () => {
      await helper.set("k", { a: 1 }, 5000);

      expect(mockCache.set).toHaveBeenCalledWith("k", { a: 1 }, 5000);
    });

    it("swallows errors from the underlying cache", async () => {
      mockCache.set.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(helper.set("k", "v", 1000)).resolves.toBeUndefined();
    });
  });

  describe("del", () => {
    it("deletes the key", async () => {
      await helper.del("k");

      expect(mockCache.del).toHaveBeenCalledWith("k");
    });

    it("swallows errors from the underlying cache", async () => {
      mockCache.del.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(helper.del("k")).resolves.toBeUndefined();
    });
  });

  describe("getOrSet", () => {
    it("returns the cached value and skips the loader on hit", async () => {
      mockCache.get.mockResolvedValue("cached");
      const loader = jest.fn().mockResolvedValue("loaded");

      await expect(helper.getOrSet("k", 1000, loader)).resolves.toBe("cached");
      expect(loader).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("runs the loader on miss and caches its result with the TTL", async () => {
      mockCache.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue("loaded");

      await expect(helper.getOrSet("k", 2000, loader)).resolves.toBe("loaded");
      expect(loader).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith("k", "loaded", 2000);
    });

    it("can skip oversized values while retaining stampede protection", async () => {
      mockCache.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue("too-large");

      await expect(
        helper.getOrSet("k", 2000, loader, () => false),
      ).resolves.toBe("too-large");
      expect(mockLock.acquire).toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("acquires a lock keyed on the cache key to prevent stampede", async () => {
      mockCache.get.mockResolvedValue(null);
      const loader = jest.fn().mockResolvedValue("loaded");

      await helper.getOrSet("mykey", 1000, loader);

      expect(mockLock.acquire).toHaveBeenCalledWith(
        "cache:get-or-set:mykey",
        expect.any(Function),
      );
    });

    it("runs the loader only once when a waiter finds the value populated inside the lock", async () => {
      // First get (before lock) misses; second get (inside lock) hits, as if a
      // concurrent caller populated the cache while we waited for the lock.
      mockCache.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("populated-by-other");
      const loader = jest.fn().mockResolvedValue("loaded");

      await expect(helper.getOrSet("k", 1000, loader)).resolves.toBe(
        "populated-by-other",
      );
      expect(loader).not.toHaveBeenCalled();
    });

    it("fails open: runs the loader when the cache is unavailable", async () => {
      mockCache.get.mockRejectedValue(new Error("ECONNREFUSED"));
      mockCache.set.mockRejectedValue(new Error("ECONNREFUSED"));
      const loader = jest.fn().mockResolvedValue("loaded");

      await expect(helper.getOrSet("k", 1000, loader)).resolves.toBe("loaded");
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  describe("strict variants", () => {
    describe("getStrict", () => {
      it("returns the cached value on hit", async () => {
        mockCache.get.mockResolvedValue({ a: 1 });

        await expect(helper.getStrict<{ a: number }>("k")).resolves.toEqual({
          a: 1,
        });
      });

      it("returns undefined on miss", async () => {
        mockCache.get.mockResolvedValue(null);

        await expect(helper.getStrict("k")).resolves.toBeUndefined();
      });

      it("rethrows when the cache throws", async () => {
        mockCache.get.mockRejectedValue(new Error("ECONNREFUSED"));

        await expect(helper.getStrict("k")).rejects.toThrow("ECONNREFUSED");
      });
    });

    describe("setStrict", () => {
      it("passes the TTL through to the underlying cache", async () => {
        await helper.setStrict("k", { a: 1 }, 5000);

        expect(mockCache.set).toHaveBeenCalledWith("k", { a: 1 }, 5000);
      });

      it("rethrows when the cache throws", async () => {
        mockCache.set.mockRejectedValue(new Error("ECONNREFUSED"));

        await expect(helper.setStrict("k", "v", 1000)).rejects.toThrow(
          "ECONNREFUSED",
        );
      });
    });

    describe("delStrict", () => {
      it("deletes the key", async () => {
        await helper.delStrict("k");

        expect(mockCache.del).toHaveBeenCalledWith("k");
      });

      it("rethrows when the cache throws", async () => {
        mockCache.del.mockRejectedValue(new Error("ECONNREFUSED"));

        await expect(helper.delStrict("k")).rejects.toThrow("ECONNREFUSED");
      });
    });
  });
});
