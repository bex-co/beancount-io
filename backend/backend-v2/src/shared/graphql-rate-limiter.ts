import type { IContext } from "@/server/graphql/context";
import { logger } from "./logger";
import { RateLimitedError } from "@/shared/errors";

interface GraphQLRateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (ctx: IContext) => string;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

/**
 * GraphQL-specific rate limiter for resolver methods
 * Tracks requests per user (or custom key) and throws RateLimitedError when limit exceeded
 */
export class GraphQLRateLimiter {
  private windowMs: number;
  private max: number;
  private message: string;
  private keyGenerator: (ctx: IContext) => string;
  private store: Record<string, RateLimitStore> = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: GraphQLRateLimiterOptions = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.max = options.max || 100; // 100 requests per windowMs by default
    this.message =
      options.message || "Too many requests, please try again later.";
    this.keyGenerator =
      options.keyGenerator ||
      ((ctx: IContext) => {
        try {
          return ctx.getCurrentUserId();
        } catch {
          return "anonymous";
        }
      });

    // Clean up old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);

    // Make sure the interval doesn't keep the process running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check if the request should be rate limited
   * Throws RateLimitedError if rate limit exceeded
   */
  public check(ctx: IContext): void {
    const key = this.keyGenerator(ctx);
    const now = Date.now();

    // Initialize or reset if needed
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    // Increment count
    this.store[key].count += 1;

    // Check if over limit
    if (this.store[key].count > this.max) {
      const resetInSeconds = Math.ceil(
        (this.store[key].resetTime - now) / 1000,
      );
      logger.warn(
        `GraphQL rate limit exceeded for key: ${key}, resolver will throw error`,
      );

      throw new RateLimitedError(resetInSeconds, this.message);
    }
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  /**
   * Stop the cleanup interval (useful for testing/cleanup)
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
