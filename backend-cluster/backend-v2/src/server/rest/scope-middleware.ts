import Router, { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import { identityFromState } from "./identity-middleware";
import { requireScopeClass } from "@/server/api/op-class";
import { requestOpId } from "@/server/api/rest-op-id";
// Type-only, so the composition root can keep importing this module without a
// runtime cycle.
import type { ApiGate } from "@/server/api/composition-root";

/**
 * Which gate a REST op sits behind, filled in by the composition root as the
 * fragments register. A live map rather than a snapshot because the middleware
 * has to be in place before the routes it guards — Koa matches layers in
 * registration order — and registration is finished long before the first
 * request arrives.
 */
export type RestGateIndex = ReadonlyMap<string, ApiGate>;

/**
 * The REST half of the op-class gate (ADR 0006 D3).
 *
 * Registered once, immediately after the identity middleware whose
 * `ctx.state.identity` it reads. It derives the op id from the *route pattern*
 * rather than the request path, so `/api-gateway/ledgers/alice/main/archive/x`
 * classifies as its route, not as one of infinitely many strings.
 *
 * Refusals leave as a thrown `ForbiddenError`, which `restErrorMiddleware`
 * already renders as a 403 `{ ok: false, error }` — the same decision the other
 * two surfaces make, in this surface's dialect.
 */
export function restScopeMiddleware(
  config: AppConfig,
  gates: RestGateIndex,
): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    const opId = matchedOpId(ctx);
    if (opId && gates.get(opId) !== "outside") {
      requireScopeClass(
        identityFromState(ctx),
        opId,
        config.api.scopeEnforcement,
      );
    }
    await next();
  };
}

/**
 * The op id of the route this request will be dispatched to.
 *
 * `ctx._matchedRoute` cannot be used here: @koa/router rewrites it to each
 * layer's own path as the chain runs, so by the time this middleware executes
 * it names this middleware's own wildcard. `ctx.matched` is the whole set of
 * path-matching layers, set before the chain, so the last one that also
 * accepts the request's method is the route that will actually handle it —
 * which is exactly how the router itself picks.
 */
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
