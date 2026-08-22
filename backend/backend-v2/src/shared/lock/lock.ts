import AsyncLock from "async-lock";

/**
 * Application-wide async lock for serializing critical operations.
 *
 * Configuration:
 * - timeout: 30 seconds max wait time before timeout error
 * - maxPending: 1000 max tasks in queue to prevent unbounded growth
 */
export const lock = new AsyncLock({
  timeout: 30000, // 30 seconds
  maxPending: 1000,
});
