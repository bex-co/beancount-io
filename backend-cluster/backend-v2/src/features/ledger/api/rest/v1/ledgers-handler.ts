import { CATALOG_READS } from "./catalog-reads";
import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { ledgerResultSchema } from "./lifecycle-handler";
import { json } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

/**
 * `GET /api-gateway/v1/ledgers` and `GET /api-gateway/v1/ledgers/{owner}/{name}` — the entry points of
 * the surface. A caller who has never read our GraphQL schema starts here:
 * list what you can reach, then address one by owner and name.
 */
export const LEDGER_ROUTES = [
  ...CATALOG_READS.map((read) =>
    v1Route({
      method: "get",
      path: `/api-gateway/v1/ledgers${read.segment ? `/${read.segment}` : ""}`,
      operationId: read.name,
      summary: read.summary,
      description: read.summary,
      query: read.query,
      responses: { 200: json(read.summary, z.array(ledgerResultSchema)) },
      handler: async ({ layers }, { identity, query }) =>
        read.fetch(layers.workflows.ledger, identity, query),
    }),
  ),

  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    operationId: "getLedger",
    summary: "Get one ledger",
    description:
      "Metadata for a single ledger: description, visibility, default branch, and the caller's permissions on it.",
    params: ledgerPathSchema,
    responses: {
      200: json("The ledger", ledgerResultSchema),
    },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledger.getLedger({
        ledgerId: ledgerIdOf(params),
        identity,
      }),
  }),
] as const;
