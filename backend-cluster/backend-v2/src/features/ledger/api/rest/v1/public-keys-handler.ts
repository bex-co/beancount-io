import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const publicKeySchema = z.object({
  id: z.number(),
  fingerprint: z.string(),
  key: z.string(),
  lastUsedAt: z.string().optional(),
  title: z.string(),
  createdAt: z.string(),
});
export const publicKeyListQuery = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .strict();
export const publicKeyIdQuery = z.object({ keyId: z.coerce.number() }).strict();
export const publicKeyCreateInput = z
  .object({
    key: z.string(),
    title: z.string(),
    readOnly: z.boolean().nullable().default(false),
  })
  .strict();
export const publicKeyDeleteInput = z.object({ keyId: z.number() }).strict();

export const PUBLIC_KEY_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/public-keys",
    summary: "List the caller's SSH public keys",
    description:
      "Administrative account operation. Uses the authenticated user, including for ledger-pinned credentials. Pagination is passed to the key service.",
    query: publicKeyListQuery,
    responses: { 200: json("SSH public keys", z.array(publicKeySchema)) },
    handler: async ({ layers }, { identity, query }) =>
      layers.services.ledgerPublicKey.listPublicKeys(identity, query),
  }),
  v1Route({
    method: "get",
    path: "/api-gateway/v1/public-keys/{keyId}",
    summary: "Read the caller's SSH public key",
    description:
      "Administrative account operation. The key is fetched using the authenticated user's key API.",
    params: publicKeyIdQuery,
    responses: { 200: json("SSH public key", publicKeySchema) },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.ledgerPublicKey.getPublicKey(identity, params.keyId),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/public-keys",
    summary: "Create an SSH public key for the caller",
    description:
      "Administrative account operation. Key format and uniqueness are checked by the repository service. readOnly defaults to false.",
    body: publicKeyCreateInput,
    responses: { 200: json("Created SSH public key", publicKeySchema) },
    handler: async ({ layers }, { identity, body }) =>
      layers.services.ledgerPublicKey.createPublicKey(identity, {
        ...body,
        readOnly: body.readOnly ?? undefined,
      }),
  }),
  v1Route({
    method: "delete",
    path: "/api-gateway/v1/public-keys/{keyId}",
    summary: "Delete the caller's SSH public key",
    description:
      "Administrative account operation. The repository service enforces key ownership.",
    params: publicKeyIdQuery,
    responses: {
      200: json("Deleted key identifier", z.object({ id: z.number() })),
    },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.ledgerPublicKey.deletePublicKey(identity, params.keyId),
  }),
];
