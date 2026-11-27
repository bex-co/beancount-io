import Router, { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import { identityFromState } from "./identity-middleware";
import { requireScopeClass } from "@/server/api/op-class";
import { matchedOpId } from "@/server/api/rest-op-id";
import { runWithOperationId } from "@/shared/async-context";
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
    const gate = opId ? gates.get(opId) : undefined;
    if (opId && gate !== "outside") {
      // An `enforced` mount denies regardless of the global mode: shadow exists
      // to protect working integrations from a misclassification, and a surface
      // with no clients yet has none to protect (w1/m21's v1 routes).
      requireScopeClass(
        identityFromState(ctx),
        opId,
        gate === "enforced" ? "enforce" : config.api.scopeEnforcement,
      );
    }
    if (opId) {
      await runWithOperationId(opId, next);
    } else {
      await next();
    }
  };
}
