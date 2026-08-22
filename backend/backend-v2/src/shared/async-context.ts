import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request context that is automatically propagated through async operations.
 * This context is available throughout the entire request lifecycle.
 */
export interface RequestContext {
  /**
   * Unique identifier for the request (correlation ID)
   * Used to trace logs across the entire request flow
   */
  requestId: string;

  /**
   * Authenticated user ID if the request is authenticated
   */
  userId?: string;

  /**
   * Additional contextual data that can be added during request processing
   */
  [key: string]: unknown;
}

/**
 * AsyncLocalStorage instance for storing request context.
 * This allows context to be implicitly available throughout the async call chain
 * without explicitly passing it through function parameters.
 *
 * @example
 * ```typescript
 * // Set context (typically in middleware)
 * await asyncContext.run({ requestId: "abc-123" }, async () => {
 *   await handleRequest();
 * });
 *
 * // Get context anywhere in the call chain
 * const context = asyncContext.getStore();
 * console.log(context?.requestId); // "abc-123"
 * ```
 */
export const asyncContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage.
 * Returns undefined if called outside of an async context.
 *
 * @returns The current request context or undefined
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncContext.getStore();
}

/**
 * Get the current request ID from the async context.
 * Returns undefined if no context is active.
 *
 * @returns The current request ID or undefined
 */
export function getRequestId(): string | undefined {
  return asyncContext.getStore()?.requestId;
}

/**
 * Get the current user ID from the async context.
 * Returns undefined if no user is authenticated or no context is active.
 *
 * @returns The current user ID or undefined
 */
export function getUserId(): string | undefined {
  return asyncContext.getStore()?.userId;
}

/**
 * Update the current request context with additional data.
 * This merges the new data with the existing context.
 *
 * @param data - Additional data to merge into the context
 *
 * @example
 * ```typescript
 * // Add user ID after authentication
 * updateRequestContext({ userId: "user-123" });
 *
 * // Add custom tracking data
 * updateRequestContext({ operation: "graphql-query" });
 * ```
 */
export function updateRequestContext(data: Partial<RequestContext>): void {
  const current = asyncContext.getStore();
  if (current) {
    Object.assign(current, data);
  }
}
