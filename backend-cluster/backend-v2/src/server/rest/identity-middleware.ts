import Router, { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import { type AppLayers } from "@/foundation/composition";
import { type Identity, resolveIdentity } from "@/server/api/identity";

/**
 * Koa state key the resolved caller is published under. REST handlers read
 * `ctx.state.identity` instead of re-parsing credentials themselves — before
 * this, each route did its own thing (`download-archive-handler` even accepted
 * a JWT in the query string).
 */
interface IdentityState {
  identity?: Identity;
}

/**
 * Attach the resolved {@link Identity} to REST request state.
 *
 * Deliberately non-blocking: it resolves whoever is there and moves on, leaving
 * "is this route authenticated?" to the route. Many REST routes are legitimately
 * public (health, webhooks, OIDC ceremony, sitemap) and carry their own
 * credentials or none at all — the always-public census in ADR 0006 D9 lists
 * them. Registered once, ahead of the feature routes.
 */
export function restIdentityMiddleware(
  layers: AppLayers,
  config: AppConfig,
): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    ctx.state.identity = await resolveIdentity(ctx, layers.database, config);
    await next();
  };
}

/** Read the resolved caller from REST state, if any. */
export function identityFromState(ctx: RouterContext): Identity | undefined {
  return (ctx.state as IdentityState).identity;
}
