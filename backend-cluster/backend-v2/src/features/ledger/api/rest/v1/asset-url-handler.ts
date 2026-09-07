import { z } from "@/shared/zod-openapi-setup";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
import { anonymousV1Route, v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
export const assetUrlQuery = z
  .object({
    ledgerRepoId: z.coerce.number().int().positive(),
    filename: z.string(),
  })
  .strict();
export const ASSET_URL_ROUTES = [
  anonymousV1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/archive-download-url",
    summary: "Discover a ledger archive download URL",
    description:
      "Return the same main.zip download URL as GraphQL. Public-ledger discovery permits anonymous callers; authenticated access retains current scope, pin, and relationship checks. Fetching the returned URL performs its own authorization.",
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    responses: {
      200: json("Archive download URL", z.object({ downloadUrl: z.string() })),
    },
    handler: async ({ layers }, { identity, params }) => ({
      downloadUrl:
        await layers.services.ledgerAsset.getLedgerArchiveDownloadUrl(
          ledgerIdOf(params),
          identity,
        ),
    }),
  }),
  v1Route({
    method: "get",
    path: "/api-gateway/v1/asset-download-url",
    summary: "Get a ledger asset download URL",
    description:
      "Resolve the ledger by numeric repository ID, check current file-read access, and issue the same presigned asset URL as GraphQL. filename is relative to that repository's asset directory.",
    query: assetUrlQuery,
    responses: {
      200: json(
        "Presigned download URL",
        z.object({ downloadUrl: z.string() }),
      ),
    },
    handler: async ({ layers }, { identity, query }) => ({
      downloadUrl: await layers.services.ledgerAsset.getAssetDownloadUrl(
        query.ledgerRepoId,
        query.filename,
        identity,
      ),
    }),
  }),
];
