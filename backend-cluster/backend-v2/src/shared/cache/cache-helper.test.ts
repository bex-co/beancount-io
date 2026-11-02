import { type Cache } from "cache-manager";

jest.mock("@/shared/lock");
jest.mock("@/shared/logger", () => {
  const logger = { warn: jest.fn(), error: jest.fn(), child: jest.fn() };
  logger.child.mockReturnValue(logger);
  return { logger };
});

import { lock } from "@/shared/lock";
import { logger } from "@/shared/logger";
import {
  createCacheHelper,
  invalidateUserFeed,
  type CacheHelper,
} from "./cache-helper";
import { CACHE_KEYS } from "./cache-keys";

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

  it.each([
    "get",
    "set",
    "del",
    "getStrict",
    "setStrict",
    "delStrict",
  ] as const)(
    "%s never logs auth keys, values or provider errors while retaining its failure semantics",
    async (operation) => {
      const secret = "synthetic-private-auth-token";
      const key = `auth:password-reset:${secret}`;
      const value = { email: `${secret}@example.com`, otp: secret };
      const error = Object.assign(
        new Error(`SET ${key} ${JSON.stringify(value)}`),
        {
          name: secret,
          command: { name: "set", args: [key, value] },
        },
      );
      mockCache.get.mockRejectedValue(error);
      mockCache.set.mockRejectedValue(error);
      mockCache.del.mockRejectedValue(error);
      const operations = {
        get: () => helper.get(key),
        set: () => helper.set(key, value, 1000),
        del: () => helper.del(key),
        getStrict: () => helper.getStrict(key),
        setStrict: () => helper.setStrict(key, value, 1000),
        delStrict: () => helper.delStrict(key),
      };

      const result = operations[operation]();
      const strict = operation.endsWith("Strict");
      if (strict) await expect(result).rejects.toBe(error);
      else await expect(result).resolves.toBeUndefined();

      const logs = (strict ? logger.error : logger.warn) as jest.Mock;
      expect(logs.mock.calls).toEqual([
        [
          "Cache operation failed",
          { operation, errorCategory: "CACHE_FAILURE" },
        ],
      ]);
      expect(JSON.stringify(logs.mock.calls)).not.toContain(secret);
    },
  );

  it("keeps read-through cache failures private while returning the loader's value", async () => {
    const secret = "synthetic-private-otp";
    const error = new Error(secret);
    mockCache.get.mockRejectedValue(error);
    mockCache.set.mockRejectedValue(error);

    await expect(
      helper.getOrSet(`auth:otp:${secret}`, 1000, async () => ({
        otp: secret,
      })),
    ).resolves.toEqual({ otp: secret });

    expect((logger.warn as jest.Mock).mock.calls).toEqual([
      [
        "Cache operation failed",
        { operation: "get", errorCategory: "CACHE_FAILURE" },
      ],
      [
        "Cache operation failed",
        { operation: "get", errorCategory: "CACHE_FAILURE" },
      ],
      [
        "Cache operation failed",
        { operation: "set", errorCategory: "CACHE_FAILURE" },
      ],
    ]);
    expect(JSON.stringify((logger.warn as jest.Mock).mock.calls)).not.toContain(
      secret,
    );
  });
});

describe("invalidateUserFeed", () => {
  it("deletes exactly that user's Gitea activity key", async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    await invalidateUserFeed({ del }, "u1");
    expect(del).toHaveBeenCalledWith(CACHE_KEYS.feed.giteaByUser("u1"));
    expect(del).toHaveBeenCalledTimes(1);
  });
});
