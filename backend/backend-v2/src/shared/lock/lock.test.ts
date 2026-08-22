import { lock } from "./lock";

describe("lock", () => {
  it("should be defined", () => {
    expect(lock).toBeDefined();
  });

  it("should have acquire method", () => {
    expect(typeof lock.acquire).toBe("function");
  });

  it("should acquire and release lock", async () => {
    const result = await lock.acquire("test-key", async () => {
      return "success";
    });

    expect(result).toBe("success");
  });

  it("should serialize access to the same key", async () => {
    const order: number[] = [];
    const startTimes: number[] = [];

    const task1 = lock.acquire("serialize-key", async () => {
      startTimes.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 50));
      order.push(1);
    });

    const task2 = lock.acquire("serialize-key", async () => {
      startTimes.push(Date.now());
      order.push(2);
    });

    await Promise.all([task1, task2]);

    // Tasks should execute in order due to serialization
    expect(order).toEqual([1, 2]);
  });

  it("should propagate errors from the callback", async () => {
    await expect(
      lock.acquire("error-key", async () => {
        throw new Error("Test error");
      }),
    ).rejects.toThrow("Test error");
  });

  it("should release lock even if callback throws", async () => {
    // First, throw an error
    try {
      await lock.acquire("release-on-error-key", async () => {
        throw new Error("First error");
      });
    } catch {
      // Ignore error
    }

    // Second acquire should succeed (lock was released)
    const result = await lock.acquire("release-on-error-key", async () => {
      return "success after error";
    });

    expect(result).toBe("success after error");
  });

  it("should handle synchronous return values", async () => {
    const result = await lock.acquire("sync-key", () => {
      return 42;
    });

    expect(result).toBe(42);
  });
});
