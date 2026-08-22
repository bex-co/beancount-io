import { createRedisCache, closeRedisCache } from "../redis-utils";

// Mock dependencies before they are used by the module
jest.mock("@keyv/redis");
jest.mock("keyv");
jest.mock("cache-manager");
jest.mock("@/shared/lock");

import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { createCache } from "cache-manager";
import { lock } from "@/shared/lock";

const MockKeyvRedis = KeyvRedis as jest.MockedClass<typeof KeyvRedis>;
const MockKeyv = Keyv as jest.MockedClass<typeof Keyv>;
const mockCreateCache = createCache as jest.MockedFunction<typeof createCache>;
const mockLock = lock as jest.Mocked<typeof lock>;

describe("redis-utils", () => {
  let mockCacheInstance: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let mockKeyvRedisInstance: { disconnect: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCacheInstance = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue("ok"),
      del: jest.fn().mockResolvedValue(undefined),
    };

    mockKeyvRedisInstance = {
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    MockKeyvRedis.mockImplementation(() => mockKeyvRedisInstance as never);
    MockKeyv.mockImplementation(() => ({}) as never);
    mockCreateCache.mockReturnValue(mockCacheInstance as never);

    // Mock lock.acquire to immediately execute the callback
    mockLock.acquire = jest
      .fn()
      .mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
  });

  afterEach(async () => {
    // Reset singleton state after each test
    await closeRedisCache();
  });

  describe("createRedisCache", () => {
    it("should throw when Redis URI is empty", async () => {
      await expect(createRedisCache("")).rejects.toThrow(
        "Redis URI required: ensure 'config.redis.uri' is set",
      );
    });

    it("should create and return a cache instance", async () => {
      const cache = await createRedisCache("redis://localhost:6379");

      expect(cache).toBeDefined();
      expect(MockKeyvRedis).toHaveBeenCalledWith("redis://localhost:6379", {
        connectionTimeout: 10000,
      });
      expect(mockCreateCache).toHaveBeenCalled();
    });

    it("should use singleton pattern and return the same instance on subsequent calls", async () => {
      const cache1 = await createRedisCache("redis://localhost:6379");
      const cache2 = await createRedisCache("redis://localhost:6379");

      expect(cache1).toBe(cache2);
      // createCache should only be called once due to singleton
      expect(mockCreateCache).toHaveBeenCalledTimes(1);
    });

    it("should use the provided namespace when creating the Keyv instance", async () => {
      await createRedisCache("redis://localhost:6379", "my-namespace");

      expect(MockKeyv).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "my-namespace" }),
      );
    });

    it("should use default namespace 'backend-v2' when not provided", async () => {
      await createRedisCache("redis://localhost:6379");

      expect(MockKeyv).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "backend-v2" }),
      );
    });

    it("should configure a type-preserving serializer/deserializer on Keyv", async () => {
      await createRedisCache("redis://localhost:6379");

      expect(MockKeyv).toHaveBeenCalledWith(
        expect.objectContaining({
          serialize: expect.any(Function),
          deserialize: expect.any(Function),
        }),
      );
    });

    it("should validate the connection by setting and getting a test key", async () => {
      await createRedisCache("redis://localhost:6379");

      expect(mockCacheInstance.set).toHaveBeenCalledWith(
        "__connection_test__",
        "ok",
        1000,
      );
      expect(mockCacheInstance.get).toHaveBeenCalledWith("__connection_test__");
      expect(mockCacheInstance.del).toHaveBeenCalledWith("__connection_test__");
    });

    it("should throw and clean up when connection validation fails (value mismatch)", async () => {
      mockCacheInstance.get.mockResolvedValue("wrong-value");

      await expect(createRedisCache("redis://localhost:6379")).rejects.toThrow(
        "Redis connection validation failed",
      );

      expect(mockKeyvRedisInstance.disconnect).toHaveBeenCalled();
    });

    it("should throw and clean up when cache.set throws", async () => {
      mockCacheInstance.set.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(createRedisCache("redis://localhost:6379")).rejects.toThrow(
        "Redis connection validation failed: ECONNREFUSED",
      );

      expect(mockKeyvRedisInstance.disconnect).toHaveBeenCalled();
    });

    it("should use lock to prevent concurrent initialization", async () => {
      await createRedisCache("redis://localhost:6379");

      expect(mockLock.acquire).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
      );
    });
  });

  describe("closeRedisCache", () => {
    it("should do nothing when no cache is initialized", async () => {
      await expect(closeRedisCache()).resolves.not.toThrow();
    });

    it("should disconnect and reset state when cache is initialized", async () => {
      await createRedisCache("redis://localhost:6379");

      await closeRedisCache();

      expect(mockKeyvRedisInstance.disconnect).toHaveBeenCalled();
    });

    it("should allow creating a new cache after closing", async () => {
      await createRedisCache("redis://localhost:6379");
      await closeRedisCache();

      // Reset mock call counts
      jest.clearAllMocks();
      mockLock.acquire = jest
        .fn()
        .mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());
      mockCacheInstance.get.mockResolvedValue("ok");

      const cache = await createRedisCache("redis://localhost:6379");

      expect(cache).toBeDefined();
      expect(mockCreateCache).toHaveBeenCalledTimes(1);
    });
  });
});
