import {
  createRateLimiter,
  clearRateLimitStores,
  checkRateLimit,
} from "./rate-limiter";
import { logger } from "./logger";
import { RateLimitedError } from "@/shared/errors";
import type { RouterContext } from "@koa/router";

jest.mock("./logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Helper to create a mock context
const createMockContext = (
  ip: string = "127.0.0.1",
): Partial<RouterContext> => ({
  ip,
  status: 200,
  body: null,
});

// Helper to create a mock next function
const createMockNext = () => jest.fn(async () => {});

describe("rate-limiter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearRateLimitStores();
  });

  afterEach(() => {
    jest.useRealTimers();
    clearRateLimitStores();
  });

  describe("createRateLimiter", () => {
    it("should allow requests within the limit", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      });

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await limiter(ctx, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(ctx.status).toBe(200);
    });

    it("should block requests exceeding the limit", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
      });

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // Make 3 requests (at the limit)
      for (let i = 0; i < 3; i++) {
        await limiter(ctx, next);
      }

      // 4th request should be blocked
      await limiter(ctx, next);

      expect(next).toHaveBeenCalledTimes(3); // Only first 3 allowed
      expect(ctx.status).toBe(429);
      expect(ctx.body).toEqual({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests, please try again later.",
        },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        "Rate limit exceeded for 127.0.0.1",
      );
    });

    it("should use default options when none provided", async () => {
      const limiter = createRateLimiter();

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // Default is 100 requests per minute
      for (let i = 0; i < 100; i++) {
        await limiter(ctx, next);
      }

      // 101st request should be blocked
      await limiter(ctx, next);

      expect(next).toHaveBeenCalledTimes(100);
      expect(ctx.status).toBe(429);
    });

    it("should reset counter after window expires", async () => {
      const limiter = createRateLimiter({
        windowMs: 1000, // 1 second
        max: 2,
      });

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // Make 2 requests (at the limit)
      await limiter(ctx, next);
      await limiter(ctx, next);

      // 3rd request should be blocked
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(ctx.status).toBe(429);

      // Fast forward past the window
      jest.advanceTimersByTime(1001);

      // Reset context status for next request
      ctx.status = 200;

      // Should be allowed again
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(3);
    });

    it("should track different IPs separately", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
      });

      const ctx1 = createMockContext("192.168.1.1") as RouterContext;
      const ctx2 = createMockContext("192.168.1.2") as RouterContext;
      const next = createMockNext();

      // Make 2 requests from IP 1 (at the limit)
      await limiter(ctx1, next);
      await limiter(ctx1, next);

      // 3rd request from IP 1 should be blocked
      await limiter(ctx1, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(ctx1.status).toBe(429);

      // But requests from IP 2 should still work
      await limiter(ctx2, next);
      await limiter(ctx2, next);
      expect(next).toHaveBeenCalledTimes(4);
      expect(ctx2.status).toBe(200);
    });

    it("should use custom keyGenerator", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (ctx) => (ctx.headers?.["user-id"] as string) || ctx.ip,
      });

      const ctx1 = {
        ...createMockContext("127.0.0.1"),
        headers: { "user-id": "user-123" },
      } as RouterContext;

      const ctx2 = {
        ...createMockContext("127.0.0.1"),
        headers: { "user-id": "user-456" },
      } as RouterContext;

      const next = createMockNext();

      // Make 2 requests from user-123 (at the limit)
      await limiter(ctx1, next);
      await limiter(ctx1, next);

      // 3rd request from user-123 should be blocked
      await limiter(ctx1, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(ctx1.status).toBe(429);

      // But requests from user-456 should still work (same IP but different user)
      await limiter(ctx2, next);
      await limiter(ctx2, next);
      expect(next).toHaveBeenCalledTimes(4);
      expect(ctx2.status).toBe(200);
    });

    it("should use custom message and status code", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        message: "Custom rate limit message",
        statusCode: 503,
      });

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // Make 1 request (at the limit)
      await limiter(ctx, next);

      // 2nd request should be blocked with custom message and status
      await limiter(ctx, next);

      expect(ctx.status).toBe(503);
      expect(ctx.body).toEqual({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Custom rate limit message",
        },
      });
    });

    it("should clean up expired entries periodically", async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
      });

      const ctx1 = createMockContext("192.168.1.1") as RouterContext;
      const ctx2 = createMockContext("192.168.1.2") as RouterContext;
      const next = createMockNext();

      // Make requests from multiple IPs
      await limiter(ctx1, next);
      await limiter(ctx2, next);

      // Fast forward to trigger cleanup
      jest.advanceTimersByTime(1100);

      // Both should be cleaned up and able to make new requests
      ctx1.status = 200;
      ctx2.status = 200;
      await limiter(ctx1, next);
      await limiter(ctx2, next);

      expect(next).toHaveBeenCalledTimes(4);
    });

    it("should increment count correctly for each request", async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
      });

      const ctx = createMockContext() as RouterContext;
      const next = createMockNext();

      // First request
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request (at limit)
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(3);

      // Fourth request (over limit)
      await limiter(ctx, next);
      expect(next).toHaveBeenCalledTimes(3); // Still 3, not called
      expect(ctx.status).toBe(429);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests within the limit", () => {
      expect(() => {
        checkRateLimit("test-key", { max: 5, windowMs: 60000 });
        checkRateLimit("test-key", { max: 5, windowMs: 60000 });
        checkRateLimit("test-key", { max: 5, windowMs: 60000 });
      }).not.toThrow();
    });

    it("should throw RateLimitedError when limit exceeded", () => {
      checkRateLimit("test-key-2", { max: 2, windowMs: 60000 });
      checkRateLimit("test-key-2", { max: 2, windowMs: 60000 });

      expect(() => {
        checkRateLimit("test-key-2", { max: 2, windowMs: 60000 });
      }).toThrow(RateLimitedError);

      expect(() => {
        checkRateLimit("test-key-2", { max: 2, windowMs: 60000 });
      }).toThrow("Too many requests, please try again later.");

      expect(logger.warn).toHaveBeenCalledWith(
        "Rate limit exceeded for test-key-2",
      );
    });

    it("should use default options when none provided", () => {
      // Default is 100 requests per minute
      for (let i = 0; i < 100; i++) {
        checkRateLimit("default-key");
      }

      expect(() => {
        checkRateLimit("default-key");
      }).toThrow(RateLimitedError);
    });

    it("should use custom error message", () => {
      checkRateLimit("custom-msg-key", {
        max: 1,
        message: "Custom error message",
      });

      expect(() => {
        checkRateLimit("custom-msg-key", {
          max: 1,
          message: "Custom error message",
        });
      }).toThrow("Custom error message");
    });

    it("should reset counter after window expires", () => {
      checkRateLimit("reset-key", { max: 2, windowMs: 1000 });
      checkRateLimit("reset-key", { max: 2, windowMs: 1000 });

      // Should throw on 3rd request
      expect(() => {
        checkRateLimit("reset-key", { max: 2, windowMs: 1000 });
      }).toThrow(RateLimitedError);

      // Fast forward past the window
      jest.advanceTimersByTime(1001);

      // Should be allowed again
      expect(() => {
        checkRateLimit("reset-key", { max: 2, windowMs: 1000 });
      }).not.toThrow();
    });

    it("should track different keys separately", () => {
      checkRateLimit("key-1", { max: 2, windowMs: 60000 });
      checkRateLimit("key-1", { max: 2, windowMs: 60000 });
      checkRateLimit("key-2", { max: 2, windowMs: 60000 });
      checkRateLimit("key-2", { max: 2, windowMs: 60000 });

      // key-1 should be at limit
      expect(() => {
        checkRateLimit("key-1", { max: 2, windowMs: 60000 });
      }).toThrow(RateLimitedError);

      // key-2 should also be at limit
      expect(() => {
        checkRateLimit("key-2", { max: 2, windowMs: 60000 });
      }).toThrow(RateLimitedError);
    });

    it("should throw RateLimitedError with correct error code", () => {
      checkRateLimit("error-code-key", { max: 1 });

      expect(() => {
        checkRateLimit("error-code-key", { max: 1 });
      }).toThrow(RateLimitedError);

      // Verify the error details by catching it
      try {
        checkRateLimit("error-code-key", { max: 1 });
      } catch (error) {
        expect((error as RateLimitedError).category).toBe("RATE_LIMITED");
      }
    });
  });
});
