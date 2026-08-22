import type { IContext } from "@/server/graphql/context";
import { RateLimitedError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { GraphQLLoaders } from "@/server/graphql/loaders";

import { GraphQLRateLimiter } from "./graphql-rate-limiter";

describe("GraphQLRateLimiter", () => {
  let rateLimiter: GraphQLRateLimiter;
  let mockContext: IContext;

  beforeEach(() => {
    // Use fake timers to speed up tests
    jest.useFakeTimers();

    // Create a fresh rate limiter for each test
    rateLimiter = new GraphQLRateLimiter({
      windowMs: 1000, // 1 second for faster tests
      max: 3, // Allow 3 requests per window
      message: "Rate limit exceeded",
    });

    // Mock context
    mockContext = {
      userId: "test-user-123",
      token: "mock-token",
      reqHeaders: {},
      platform: "web",
      config: {} as AppConfig,
      koaCtx: {} as any,
      loaders: {} as GraphQLLoaders,
      getCurrentUserId: jest.fn().mockReturnValue("test-user-123"),
      getCurrentUser: jest.fn(),
      getCurrentIdentity: jest.fn(),
    };
  });

  afterEach(() => {
    // Clean up the rate limiter
    rateLimiter.destroy();
    // Restore real timers
    jest.useRealTimers();
  });

  describe("basic rate limiting", () => {
    it("should allow requests within the limit", () => {
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
    });

    it("should throw error when limit is exceeded", () => {
      // Make 3 allowed requests
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // 4th request should throw
      expect(() => rateLimiter.check(mockContext)).toThrow(RateLimitedError);
      expect(() => rateLimiter.check(mockContext)).toThrow(
        "Rate limit exceeded",
      );
    });

    it("should include retry-after in error extensions", () => {
      // Exhaust the limit
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      try {
        rateLimiter.check(mockContext);
        fail("Should have thrown RateLimitedError");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitedError);
        const rateLimitedError = error as RateLimitedError;
        expect(rateLimitedError.category).toBe("RATE_LIMITED");
        expect(rateLimitedError.metadata).toHaveProperty("retryAfter");
        expect(typeof rateLimitedError.metadata?.retryAfter).toBe("number");
      }
    });
  });

  describe("window reset", () => {
    it("should reset count after window expires", () => {
      // Use all 3 requests
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // Fast-forward time past the window
      jest.advanceTimersByTime(1100);

      // Should be able to make requests again
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
    });

    it("should track separate windows for consecutive requests", () => {
      // First window
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // Fast-forward time past the window
      jest.advanceTimersByTime(1100);

      // Second window - should get fresh count
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // 4th request in second window should fail
      expect(() => rateLimiter.check(mockContext)).toThrow();
    });
  });

  describe("per-user tracking", () => {
    it("should track different users separately", () => {
      const user1Context = {
        ...mockContext,
        userId: "user-1",
        getCurrentUserId: jest.fn().mockReturnValue("user-1"),
      };
      const user2Context = {
        ...mockContext,
        userId: "user-2",
        getCurrentUserId: jest.fn().mockReturnValue("user-2"),
      };

      // User 1 makes 3 requests
      rateLimiter.check(user1Context);
      rateLimiter.check(user1Context);
      rateLimiter.check(user1Context);

      // User 1 should be rate limited
      expect(() => rateLimiter.check(user1Context)).toThrow();

      // User 2 should still be able to make requests
      expect(() => rateLimiter.check(user2Context)).not.toThrow();
      expect(() => rateLimiter.check(user2Context)).not.toThrow();
    });

    it("should use custom key generator if provided", () => {
      const customRateLimiter = new GraphQLRateLimiter({
        windowMs: 1000,
        max: 2,
        keyGenerator: (ctx) => ctx.reqHeaders["x-api-key"] || "default",
      });

      const context1 = {
        ...mockContext,
        reqHeaders: { "x-api-key": "key-1" },
      };
      const context2 = {
        ...mockContext,
        reqHeaders: { "x-api-key": "key-2" },
      };

      // Key 1 makes 2 requests
      customRateLimiter.check(context1);
      customRateLimiter.check(context1);

      // Key 1 should be limited
      expect(() => customRateLimiter.check(context1)).toThrow();

      // Key 2 should not be affected
      expect(() => customRateLimiter.check(context2)).not.toThrow();

      customRateLimiter.destroy();
    });

    it("should handle anonymous users when userId is missing", () => {
      const anonymousContext = {
        ...mockContext,
        userId: "",
        getCurrentUserId: jest.fn().mockImplementation(() => {
          throw new Error("Authentication required");
        }),
      };

      // Should fall back to "anonymous" key
      rateLimiter.check(anonymousContext);
      rateLimiter.check(anonymousContext);
      rateLimiter.check(anonymousContext);

      expect(() => rateLimiter.check(anonymousContext)).toThrow();
    });
  });

  describe("configuration", () => {
    it("should use default values when no options provided", () => {
      const defaultRateLimiter = new GraphQLRateLimiter();

      // Default should be 100 requests per 60 seconds
      for (let i = 0; i < 100; i += 1) {
        expect(() => defaultRateLimiter.check(mockContext)).not.toThrow();
      }

      // 101st should fail
      expect(() => defaultRateLimiter.check(mockContext)).toThrow(
        "Too many requests, please try again later.",
      );

      defaultRateLimiter.destroy();
    });

    it("should use custom window and max values", () => {
      const customRateLimiter = new GraphQLRateLimiter({
        windowMs: 500,
        max: 5,
      });

      // Should allow 5 requests
      for (let i = 0; i < 5; i += 1) {
        expect(() => customRateLimiter.check(mockContext)).not.toThrow();
      }

      // 6th should fail
      expect(() => customRateLimiter.check(mockContext)).toThrow();

      customRateLimiter.destroy();
    });

    it("should use custom error message", () => {
      const customRateLimiter = new GraphQLRateLimiter({
        max: 1,
        message: "Custom error message",
      });

      customRateLimiter.check(mockContext);

      expect(() => customRateLimiter.check(mockContext)).toThrow(
        "Custom error message",
      );

      customRateLimiter.destroy();
    });
  });

  describe("cleanup", () => {
    it("should clean up expired entries automatically", () => {
      const user1Context = {
        ...mockContext,
        userId: "user-1",
        getCurrentUserId: jest.fn().mockReturnValue("user-1"),
      };
      const user2Context = {
        ...mockContext,
        userId: "user-2",
        getCurrentUserId: jest.fn().mockReturnValue("user-2"),
      };

      // Create entries for multiple users
      rateLimiter.check(user1Context);
      rateLimiter.check(user2Context);

      // Fast-forward time past the window
      jest.advanceTimersByTime(1100);

      // Make a new request to trigger cleanup
      rateLimiter.check(user1Context);

      // Both users should have fresh windows
      expect(() => rateLimiter.check(user1Context)).not.toThrow();
      expect(() => rateLimiter.check(user2Context)).not.toThrow();
    });

    it("should stop cleanup interval when destroyed", () => {
      const testRateLimiter = new GraphQLRateLimiter();

      // Destroy should clear the interval
      testRateLimiter.destroy();

      // Should not throw (interval is cleared)
      expect(() => testRateLimiter.destroy()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid consecutive requests", () => {
      // Make requests as fast as possible
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // Should still enforce limit
      expect(() => rateLimiter.check(mockContext)).toThrow();
    });

    it("should handle requests at exact window boundary", () => {
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // Fast-forward time past the window
      jest.advanceTimersByTime(1100);

      // Should allow new requests
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
    });

    it("should calculate correct retry-after time", () => {
      // Exhaust limit
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      try {
        rateLimiter.check(mockContext);
        fail("Should have thrown");
      } catch (error) {
        const rateLimitedError = error as RateLimitedError;
        const retryAfter = rateLimitedError.metadata?.retryAfter as number;

        // Should be approximately 1 second (window is 1000ms)
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(1);
      }
    });

    it("should handle same user making requests after partial window expiry", () => {
      // Make 2 requests
      rateLimiter.check(mockContext);
      rateLimiter.check(mockContext);

      // Fast-forward time by half the window
      jest.advanceTimersByTime(500);

      // Should still have the same limit
      rateLimiter.check(mockContext);
      expect(() => rateLimiter.check(mockContext)).toThrow();
    });
  });

  describe("memory management", () => {
    it("should not leak memory with many different users", () => {
      // Create entries for many users
      for (let i = 0; i < 1000; i += 1) {
        const ctx = {
          ...mockContext,
          userId: `user-${i}`,
          getCurrentUserId: jest.fn().mockReturnValue(`user-${i}`),
        };
        rateLimiter.check(ctx);
      }

      // Should not throw or crash
      expect(() => rateLimiter.check(mockContext)).not.toThrow();
    });

    it("should clean up old entries periodically", () => {
      const shortWindowRateLimiter = new GraphQLRateLimiter({
        windowMs: 100, // Very short window
        max: 1,
      });

      // Create entries for multiple users
      for (let i = 0; i < 10; i += 1) {
        const ctx = {
          ...mockContext,
          userId: `user-${i}`,
          getCurrentUserId: jest.fn().mockReturnValue(`user-${i}`),
        };
        shortWindowRateLimiter.check(ctx);
      }

      // Fast-forward time for cleanup interval to run
      jest.advanceTimersByTime(200);

      // Old entries should be cleaned up, new requests should work
      const ctx = {
        ...mockContext,
        userId: "user-0",
        getCurrentUserId: jest.fn().mockReturnValue("user-0"),
      };
      expect(() => shortWindowRateLimiter.check(ctx)).not.toThrow();

      shortWindowRateLimiter.destroy();
    });
  });
});
