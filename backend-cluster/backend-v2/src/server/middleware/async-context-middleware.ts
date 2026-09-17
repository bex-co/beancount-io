import { Context, Next } from "koa";
import { randomUUID } from "node:crypto";
import { asyncContext } from "@/shared/async-context";
import { getTokenFromCtx } from "@/features/auth/utils/auth";

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

  // The caller's credential, kept so the ledger service can present it to
  // beancount.io's own login-gated price routes on this user's behalf
  // (ADR 016 §7). `getTokenFromCtx` already collapses the three inlets —
  // bearer, x-api-key, and the session cookie — into one string, and the kind
  // is deliberately not narrowed: the far end resolves all three from that one
  // cookie, so filtering here would only drop credentials that work.
  const sessionToken = getTokenFromCtx(ctx as never) || undefined;

  // Run the rest of the request within the async context
  await asyncContext.run({ requestId, sessionToken }, async () => {
    await next();
  });
}
