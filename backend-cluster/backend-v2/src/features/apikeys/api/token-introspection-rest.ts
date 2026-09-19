import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { json } from "@/server/rest/v1-schemas";
import {
  registerV1Routes,
  v1Route,
  type V1Route,
} from "@/server/rest/v1-route";
import { introspectionRequestSchema, introspectionSchema } from "./api-key-schemas";

/**
 * RFC 7662 token introspection (ADR 0017).
 *
 * Mounted under `/api-gateway/v1`, deliberately *not* under
 * `/api-gateway/oauth/`. That prefix carries a blanket `REST ALL` entry in the
 * always-public census — justified for the OAuth ceremony, where requiring a
 * token to obtain a token would close the only door in, and false here. A mount
 * under it would be anonymous **and the census test would stay green**, because
 * the catch-all already covers the path and nothing would be missing. The trap
 * is silence, so the mount avoids the prefix entirely.
 *
 * A `v1Route` requires an identity unless it says `authentication: "optional"`,
 * so the safe state is the default and the unsafe state has to be typed out.
 * This endpoint never says it.
 */
export const TOKEN_INTROSPECTION_V1_ROUTES: readonly V1Route<
  never,
  never,
  never
>[] = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/token/introspect",
    operationId: "introspectToken",
    summary: "Check whether a credential is live",
    description:
      "Reports whether a token is currently usable, for OAuth access tokens, `bcio_` API keys, and session tokens alike — including whether it has been revoked, which offline signature checking cannot tell you. You may introspect your own credentials; a token belonging to anyone else reads as inactive, exactly as an invalid one does. Requires its own credential: this endpoint is never anonymous.",
    body: introspectionRequestSchema,
    responses: {
      200: json(
        "The credential's status. `active: false` carries no other field.",
        introspectionSchema,
      ),
    },
    handler: async ({ layers }, { identity, body }) =>
      layers.services.tokenIntrospection.introspect(identity, body),
  }),
];

export function setTokenIntrospectionRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerV1Routes(router, { layers, config }, TOKEN_INTROSPECTION_V1_ROUTES);
}
