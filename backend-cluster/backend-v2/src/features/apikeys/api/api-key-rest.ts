import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { z } from "@/shared/zod-openapi-setup";
import { json } from "@/server/rest/v1-schemas";
import {
  registerV1Routes,
  v1Route,
  type V1Route,
} from "@/server/rest/v1-route";
import { toPublicApiKey } from "../service/api-key-service";
import {
  apiKeyIdSchema,
  createApiKeySchema,
  mintedApiKeySchema,
  publicApiKeySchema,
} from "./api-key-schemas";

/**
 * Key management over REST — the surface the keys are mostly *for*.
 *
 * Every handler delegates to the shared application service, so the same
 * centralized PDP decision and no-self-replication rule hold on GraphQL and
 * MCP too.
 */
export const API_KEY_V1_ROUTES: readonly V1Route<never, never, never>[] = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/api-keys",
    summary: "List your API keys",
    description:
      "Every key you have minted, newest first, including revoked and expired ones. Keys are shown by prefix — the key itself was returned once, when it was created.",
    responses: {
      200: json("Your API keys", z.array(publicApiKeySchema)),
    },
    handler: async ({ layers }, { identity }) =>
      (await layers.services.apiKey.list(identity)).map(toPublicApiKey),
  }),

  v1Route({
    method: "post",
    path: "/api-gateway/v1/api-keys",
    summary: "Mint an API key",
    description:
      "Creates a key and returns its plaintext, which is shown here and never again. Requires a paid plan, and cannot be called with an API key — sign in, or use an OAuth grant.",
    body: createApiKeySchema,
    responses: {
      200: json("The new key, with its one-time plaintext", mintedApiKeySchema),
      402: json("Minting API keys requires a paid plan"),
    },
    handler: async ({ layers }, { identity, body }) => {
      const minted = await layers.services.apiKey.mint(identity, body);
      return { key: toPublicApiKey(minted.key), plaintext: minted.plaintext };
    },
  }),

  v1Route({
    method: "delete",
    path: "/api-gateway/v1/api-keys/{id}",
    summary: "Revoke an API key",
    description:
      "Stops the key working from the next request onward. Revoking twice is not an error, and a key id you do not own reads as not found.",
    params: apiKeyIdSchema,
    responses: {
      200: json("The revoked key", publicApiKeySchema),
    },
    handler: async ({ layers }, { identity, params }) =>
      toPublicApiKey(await layers.services.apiKey.revoke(identity, params.id)),
  }),
];

export function setApiKeyRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerV1Routes(router, { layers, config }, API_KEY_V1_ROUTES);
}
