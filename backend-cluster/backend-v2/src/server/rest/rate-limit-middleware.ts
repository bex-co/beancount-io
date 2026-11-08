import Router, { RouterContext } from "@koa/router";
import {
  consumeAnonymous,
  enforceRateLimit,
  isPreviewRequest,
  rateLimitOpIdFor,
} from "@/server/api/rate-limit";
import { RateLimitedError } from "@/shared/errors";
import { identityFromState } from "./identity-middleware";
import { requestOpId } from "@/server/api/rest-op-id";
import { clientAddress } from "@/server/client-address";

/**
 * The REST half of the rate limiter.
 *
 * Registered immediately after identity resolution and before the scope gate,
 * so a caller over budget is turned away before any authorization work — and,
 * more importantly, before a handler reads a body. The ADR is explicit about
 * that ordering: a limiter that engages after parsing has already spent the
 * resource it was meant to protect.
 *
 * A route with no resolvable op id (a wildcard mount) still gets charged, under
 * its anonymous family budget, so an unrecognised path is not a way around the
 * limiter.
 */
export function restRateLimitMiddleware(): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    const identity = identityFromState(ctx);
    const opId = matchedOpId(ctx);

    try {
      if (identity && opId) {
        // A mount may say which op this particular request spends — MCP's
        // handshake moves to its own cheap bucket rather than the session's
        // budget (w2/014). The policy can redirect the charge, never waive it,
        // so every request still costs something here.
        await enforceRateLimit({
          opId: rateLimitOpIdFor(opId, ctx.request.body),
          identity,
          ip: clientIp(ctx),
          preview: isPreviewRequest(ctx.request.body),
        });
      } else {
        const decision = await consumeAnonymous({
          path: ctx.path,
          ip: clientIp(ctx),
        });
        if (!decision.allowed) {
          ctx.set("Retry-After", String(decision.retryAfterSeconds));
          throw new RateLimitedError(decision.retryAfterSeconds);
        }
      }

      await next();
    } catch (err) {
      // The header belongs on the response whichever half refused, and only
      // this middleware knows the retry-after in Koa terms.
      if (err instanceof RateLimitedError) {
        const retryAfter = (err.metadata as { retryAfter?: number } | undefined)
          ?.retryAfter;
        if (retryAfter !== undefined) {
          ctx.set("Retry-After", String(retryAfter));
        }
      }
      throw err;
    }
  };
}

/**
 * The caller's IP: the `X-Forwarded-For` entry the nearest trusted proxy
 * appended (`TRUSTED_PROXY_HOPS`, set on the Koa app), or the socket address
 * when nothing is trusted. A bucket key, never an authorization input.
 */
function clientIp(ctx: RouterContext): string {
  return clientAddress(ctx);
}

function matchedOpId(ctx: RouterContext): string | undefined {
  const layers = ctx.matched;
  if (!layers) return undefined;
  const method = ctx.method.toUpperCase();
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i];
    if (layer.methods.length > 0 && layer.methods.includes(method)) {
      return requestOpId(layer.methods, layer.path, method);
    }
  }
  return undefined;
}
