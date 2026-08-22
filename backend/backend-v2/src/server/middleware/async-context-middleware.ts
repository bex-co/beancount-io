import { Context, Next } from "koa";
import { randomUUID } from "node:crypto";
import { asyncContext } from "@/shared/async-context";

/**
 * Middleware that sets up AsyncLocalStorage context for each request.
 * This enables automatic propagation of correlation IDs throughout the request lifecycle.
 *
 * The middleware:
 * 1. Generates or extracts a unique requestId
 * 2. Sets up AsyncLocalStorage context
 * 3. Adds the requestId to response headers for client-side tracking
 *
 * Request ID sources (in order of preference):
 * 1. X-Request-Id header (for distributed tracing)
 * 2. X-Correlation-Id header (alternative standard)
 * 3. Generated UUID
 *
 * @param ctx - Koa context
 * @param next - Next middleware in the chain
 */
export async function asyncContextMiddleware(
  ctx: Context,
  next: Next,
): Promise<void> {
  // Extract or generate request ID
  const requestId =
    (ctx.headers["x-request-id"] as string) ||
    (ctx.headers["x-correlation-id"] as string) ||
    randomUUID();

  // Store in Koa context state for easy access
  ctx.state.requestId = requestId;

  // Set response header for client tracking
  ctx.set("X-Request-Id", requestId);

  // Run the rest of the request within the async context
  await asyncContext.run({ requestId }, async () => {
    await next();
  });
}
