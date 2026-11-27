import Router, { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import { type AppLayers } from "@/foundation/composition";
import type { OAuthResource } from "@/features/oauth/data/config";
import { type Identity, resolveIdentity } from "@/server/api/identity";
import { matchedOpId } from "@/server/api/rest-op-id";

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
 * The OAuth resource each REST op accepts bearer tokens for, when it is not
 * the application API: the MCP mounts take the MCP audience. Filled by the
 * composition root as the fragments register, like the scope gate's index.
 */
export type RestOAuthResourceIndex = ReadonlyMap<string, OAuthResource>;

/**
 * Attach the resolved {@link Identity} to REST request state.
 *
 * Deliberately non-blocking: it resolves whoever is there and moves on, leaving
 * "is this route authenticated?" to the route. Many REST routes are legitimately
 * public (health, webhooks, OIDC ceremony, sitemap) and carry their own
 * credentials or none at all — the always-public census in ADR 0006 D9 lists
 * them. Registered once, ahead of the feature routes.
 *
 * A token is resolved against the audience of the route it reached. Resolved
 * against the application API everywhere, an MCP OAuth token had no identity
 * here, so the limiter charged its MCP requests to the caller's IP instead of
 * to the credential (w31/112).
 */
export function restIdentityMiddleware(
  layers: AppLayers,
  config: AppConfig,
  oauthResources: RestOAuthResourceIndex = new Map(),
): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    const opId = matchedOpId(ctx);
    ctx.state.identity = await resolveIdentity(ctx, layers.database, config, {
      oauthResource: opId ? oauthResources.get(opId) : undefined,
    });
    await next();
  };
}

/** Read the resolved caller from REST state, if any. */
export function identityFromState(ctx: RouterContext): Identity | undefined {
  return (ctx.state as IdentityState).identity;
}
