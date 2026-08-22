import { logger } from "./logger";
import type { Middleware, RouterContext } from "@koa/router";
import { ErrorCategory, RateLimitedError } from "@/shared/errors";

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (ctx: RouterContext) => string;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

// Shared store for rate limiting (used by both middleware and resolver utilities)
const rateLimitStores: Map<string, RateLimitStore> = new Map();
// Track intervals to prevent duplicates and enable cleanup
const rateLimitIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Clear all rate limit stores (for testing only)
 */
export function clearRateLimitStores(): void {
  // Clear all intervals
  rateLimitIntervals.forEach((interval) => {
    clearInterval(interval);
  });
  rateLimitIntervals.clear();
  rateLimitStores.clear();
}

// Simple in-memory rate limiter
export function createRateLimiter(
  options: RateLimiterOptions = {},
): Middleware {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 100; // 100 requests per windowMs by default
  const message =
    options.message || "Too many requests, please try again later.";
  const statusCode = options.statusCode || 429;
  const keyGenerator = options.keyGenerator || ((ctx: RouterContext) => ctx.ip);

  // Get or create store for this rate limiter instance
  const storeKey = `rate-limiter-${windowMs}-${max}`;
  if (!rateLimitStores.has(storeKey)) {
    rateLimitStores.set(storeKey, {});
  }
  const store = rateLimitStores.get(storeKey)!;

  // Create cleanup interval only once per store configuration
  if (!rateLimitIntervals.has(storeKey)) {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.keys(store).forEach((key) => {
        if (store[key].resetTime <= now) {
          delete store[key];
        }
      });
    }, windowMs);

    // Make sure the interval doesn't keep the process running
    if (interval.unref) {
      interval.unref();
    }

    rateLimitIntervals.set(storeKey, interval);
  }

  return async (ctx: RouterContext, next: () => Promise<void>) => {
    const key = keyGenerator(ctx);
    const now = Date.now();

    // Initialize or reset if needed
    if (!store[key] || store[key].resetTime <= now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment count
    store[key].count += 1;

    // Check if over limit
    if (store[key].count > max) {
      logger.warn(`Rate limit exceeded for ${key}`);
      ctx.status = statusCode;
      ctx.body = {
        ok: false,
        error: {
          code: ErrorCategory.RATE_LIMITED,
          message,
        },
      };
      return;
    }

    await next();
  };
}

/**
 * Check rate limit for REST API endpoints (used in resolvers and handlers)
 * @param key - Unique identifier for rate limiting (e.g., IP address or email)
 * @param options - Rate limit options
 * @throws RateLimitedError if rate limit is exceeded
 */
export function checkRateLimit(
  key: string,
  options: {
    windowMs?: number;
    max?: number;
    message?: string;
  } = {},
): void {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 100; // 100 requests per windowMs by default
  const message =
    options.message || "Too many requests, please try again later.";

  // Get or create store for this rate limiter configuration
  const storeKey = `rate-limiter-${windowMs}-${max}`;
  if (!rateLimitStores.has(storeKey)) {
    rateLimitStores.set(storeKey, {});
  }
  const store = rateLimitStores.get(storeKey)!;

  const now = Date.now();

  // Initialize or reset if needed
  if (!store[key] || store[key].resetTime <= now) {
    store[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  store[key].count += 1;

  // Check if over limit
  if (store[key].count > max) {
    const resetInSeconds = Math.ceil((store[key].resetTime - now) / 1000);
    logger.warn(`Rate limit exceeded for ${key}`);
    throw new RateLimitedError(resetInSeconds, message);
  }
}
