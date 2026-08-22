import { SitemapCache } from "../sitemap-cache";

describe("SitemapCache", () => {
  let cache: SitemapCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = SitemapCache.getInstance();
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SitemapCache.getInstance();
      const instance2 = SitemapCache.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("get and set", () => {
    it("should store and retrieve a value", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 1000; // 1 second

      cache.set(key, value, ttl);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });

    it("should return undefined for non-existent key", () => {
      const retrieved = cache.get("non-existent-key");

      expect(retrieved).toBeUndefined();
    });

    it("should return undefined for expired entry", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 50; // 50ms

      cache.set(key, value, ttl);

      // Advance past expiration
      jest.advanceTimersByTime(100);

      const retrieved = cache.get(key);

      expect(retrieved).toBeUndefined();
    });

    it("should overwrite existing value", () => {
      const key = "test-key";
      const value1 = "test-value-1";
      const value2 = "test-value-2";
      const ttl = 1000;

      cache.set(key, value1, ttl);
      cache.set(key, value2, ttl);

      const retrieved = cache.get(key);

      expect(retrieved).toBe(value2);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "value1", 1000);
      cache.set("key2", "value2", 1000);

      cache.clear();

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });
  });

  describe("TTL behavior", () => {
    it("should respect TTL and expire entries", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 100; // 100ms

      cache.set(key, value, ttl);

      // Value should exist immediately
      expect(cache.get(key)).toBe(value);

      // Advance half the TTL - should still exist
      jest.advanceTimersByTime(50);
      expect(cache.get(key)).toBe(value);

      // Advance past full expiration
      jest.advanceTimersByTime(100);
      expect(cache.get(key)).toBeUndefined();
    });

    it("should handle multiple entries with different TTLs", () => {
      cache.set("short", "short-value", 50); // 50ms
      cache.set("long", "long-value", 200); // 200ms

      // Both should exist initially
      expect(cache.get("short")).toBe("short-value");
      expect(cache.get("long")).toBe("long-value");

      // Advance past short's expiration
      jest.advanceTimersByTime(100);

      expect(cache.get("short")).toBeUndefined();
      expect(cache.get("long")).toBe("long-value");

      // Advance past long's expiration
      jest.advanceTimersByTime(150);

      expect(cache.get("long")).toBeUndefined();
    });
  });

  describe("stale cache behavior", () => {
    it("should return undefined for expired entry via get()", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 50;

      cache.set(key, value, ttl);

      // Advance past expiration
      jest.advanceTimersByTime(100);

      // get() should return undefined for expired cache
      const retrieved = cache.get(key);
      expect(retrieved).toBeUndefined();
    });

    it("should return stale data via getStale() even after expiration", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 50;

      cache.set(key, value, ttl);

      // Advance past expiration
      jest.advanceTimersByTime(100);

      // get() returns undefined
      expect(cache.get(key)).toBeUndefined();

      // But getStale() should still return the data
      const stale = cache.getStale(key);
      expect(stale).toBe(value);
    });

    it("should correctly identify expired entries via isExpired()", () => {
      const key = "test-key";
      const value = "test-value";
      const ttl = 50;

      cache.set(key, value, ttl);

      // Initially not expired
      expect(cache.isExpired(key)).toBe(false);

      // Advance past expiration
      jest.advanceTimersByTime(100);

      // Now expired
      expect(cache.isExpired(key)).toBe(true);
    });

    it("should return false for isExpired() on non-existent key", () => {
      expect(cache.isExpired("non-existent")).toBe(false);
    });

    it("should return undefined for getStale() on non-existent key", () => {
      expect(cache.getStale("non-existent")).toBeUndefined();
    });
  });
});
