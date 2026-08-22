import { processBatch } from "./batch-processor";

describe("processBatch", () => {
  describe("basic functionality", () => {
    it("should process empty array", async () => {
      const result = await processBatch([], async (x) => x, { batchSize: 10 });

      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should process single item", async () => {
      const result = await processBatch([1], async (x) => x * 2, {
        batchSize: 10,
      });

      expect(result.results).toEqual([2]);
      expect(result.errors).toEqual([]);
    });

    it("should process multiple items in single batch", async () => {
      const items = [1, 2, 3, 4, 5];
      const result = await processBatch(items, async (x) => x * 2, {
        batchSize: 10,
      });

      expect(result.results).toEqual([2, 4, 6, 8, 10]);
      expect(result.errors).toEqual([]);
    });

    it("should process items across multiple batches", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = await processBatch(items, async (x) => x * 2, {
        batchSize: 3,
      });

      expect(result.results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(result.errors).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should handle all failures", async () => {
      const items = [1, 2, 3];
      const result = await processBatch(
        items,
        async () => {
          throw new Error("Processing failed");
        },
        { batchSize: 10 },
      );

      expect(result.results).toEqual([]);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toMatchObject({
        index: 0,
        error: expect.any(Error),
      });
      expect(result.errors[0].error.message).toBe("Processing failed");
    });

    it("should handle partial failures", async () => {
      const items = [1, 2, 3, 4, 5];
      const result = await processBatch(
        items,
        async (x) => {
          if (x === 2 || x === 4) {
            throw new Error(`Failed at ${x}`);
          }
          return x * 2;
        },
        { batchSize: 10 },
      );

      expect(result.results).toEqual([2, 6, 10]);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        index: 1,
        error: expect.any(Error),
      });
      expect(result.errors[1]).toMatchObject({
        index: 3,
        error: expect.any(Error),
      });
    });

    it("should handle non-Error rejections", async () => {
      const items = [1];
      const result = await processBatch(
        items,
        async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "string error";
        },
        { batchSize: 10 },
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBeInstanceOf(Error);
      expect(result.errors[0].error.message).toBe("string error");
    });

    it("should track correct error indices across batches", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const result = await processBatch(
        items,
        async (x) => {
          if (x === 2 || x === 5 || x === 7) {
            throw new Error(`Failed at ${x}`);
          }
          return x;
        },
        { batchSize: 3 },
      );

      expect(result.results).toEqual([1, 3, 4, 6, 8]);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual([
        { index: 1, error: expect.any(Error) },
        { index: 4, error: expect.any(Error) },
        { index: 6, error: expect.any(Error) },
      ]);
    });
  });

  describe("progress tracking", () => {
    it("should call progress callback after each batch", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const progressCalls: Array<{ processed: number; total: number }> = [];

      await processBatch(items, async (x) => x, {
        batchSize: 3,
        onProgress: (processed, total) => {
          progressCalls.push({ processed, total });
        },
      });

      expect(progressCalls).toEqual([
        { processed: 3, total: 7 },
        { processed: 6, total: 7 },
        { processed: 7, total: 7 },
      ]);
    });

    it("should not call progress callback if not provided", async () => {
      const items = [1, 2, 3];
      // Should not throw
      await processBatch(items, async (x) => x, { batchSize: 2 });
    });
  });

  describe("rate limiting", () => {
    it("should delay between batches", async () => {
      const items = [1, 2, 3, 4];
      const startTime = Date.now();

      await processBatch(items, async (x) => x, {
        batchSize: 2,
        delayBetweenBatches: 50,
      });

      const duration = Date.now() - startTime;
      // Should have 1 delay (between batch 1 and batch 2)
      // Allow ~10% tolerance for timer precision and event loop scheduling
      expect(duration).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThan(200); // Allow some overhead
    });

    it("should not delay when delayBetweenBatches is 0", async () => {
      const items = [1, 2, 3, 4];
      const startTime = Date.now();

      await processBatch(items, async (x) => x, {
        batchSize: 2,
        delayBetweenBatches: 0,
      });

      const duration = Date.now() - startTime;
      // Should complete quickly without delays
      expect(duration).toBeLessThan(50);
    });

    it("should not delay when delayBetweenBatches is undefined", async () => {
      const items = [1, 2, 3, 4];
      const startTime = Date.now();

      await processBatch(items, async (x) => x, {
        batchSize: 2,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it("should not delay after the last batch", async () => {
      const items = [1, 2, 3];
      const startTime = Date.now();

      await processBatch(items, async (x) => x, {
        batchSize: 2,
        delayBetweenBatches: 50,
      });

      const duration = Date.now() - startTime;
      // Should have 1 delay (between batch 1 and batch 2), not after batch 2
      // Allow ~10% tolerance for timer precision and event loop scheduling
      expect(duration).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThan(150);
    });
  });

  describe("concurrency control", () => {
    it("should process items concurrently within a batch", async () => {
      const items = [1, 2, 3];
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      await processBatch(
        items,
        async (x) => {
          startTimes.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 50));
          endTimes.push(Date.now());
          return x;
        },
        { batchSize: 10 },
      );

      // All items should start around the same time (concurrent)
      const startSpread = Math.max(...startTimes) - Math.min(...startTimes);
      expect(startSpread).toBeLessThan(30); // Allow some overhead

      // Total time should be ~50ms (one batch), not 150ms (sequential)
      const totalTime = Math.max(...endTimes) - Math.min(...startTimes);
      expect(totalTime).toBeLessThan(100);
    });

    it("should limit concurrency to batch size", async () => {
      const items = [1, 2, 3, 4, 5, 6];
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      await processBatch(
        items,
        async () => {
          currentConcurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 10));
          currentConcurrent -= 1;
        },
        { batchSize: 3 },
      );

      // Should never exceed batch size
      expect(maxConcurrent).toBe(3);
    });
  });

  describe("type safety", () => {
    it("should preserve input and output types", async () => {
      interface User {
        id: number;
        name: string;
      }

      interface UserProfile {
        userId: number;
        displayName: string;
      }

      const users: User[] = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      const result = await processBatch(
        users,
        async (user): Promise<UserProfile> => ({
          userId: user.id,
          displayName: user.name.toUpperCase(),
        }),
        { batchSize: 10 },
      );

      expect(result.results).toEqual([
        { userId: 1, displayName: "ALICE" },
        { userId: 2, displayName: "BOB" },
      ]);
    });
  });
});
