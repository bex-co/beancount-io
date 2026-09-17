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
   * The caller's own credential, relayed by backend-v2 so this service can
   * reach beancount.io's login-gated price routes on their behalf
   * (ADR 016 §7). Relayed, never verified or trusted here.
   *
   * A live secret. It is not in the logger's `LOGGABLE_CONTEXT_KEYS`, and must
   * not be added there.
   */
  sessionToken?: string;

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
 * The caller's own credential, or undefined outside a request or when none was
 * presented. See `RequestContext.sessionToken`.
 *
 * Lives here rather than beside the envelope parser so the managed-price layer
 * can read it without `foundation/` importing from `server/`.
 */
export function getSessionToken(): string | undefined {
  return asyncContext.getStore()?.sessionToken;
}
