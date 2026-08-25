import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { json, paginationSchema } from "@/server/rest/v1-schemas";
import { v1Route } from "@/server/rest/v1-route";

/**
 * `GET /api-gateway/v1/ledgers` and `GET /api-gateway/v1/ledgers/{owner}/{name}` — the entry points of
 * the surface. A caller who has never read our GraphQL schema starts here:
 * list what you can reach, then address one by owner and name.
 */
export const LEDGER_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers",
    summary: "List the caller's ledgers",
    description:
      "Every ledger the caller can reach — owned, shared, and starred — newest first. Backed by the same source as the GraphQL `listLedgers` query.",
    query: paginationSchema,
    responses: {
      200: json("The caller's ledgers", z.array(z.unknown())),
    },
    handler: async ({ layers }, { identity, query }) =>
      layers.workflows.ledger.listLedgers({
        userId: identity.userId,
        args: { page: query.page, limit: query.limit },
      }),
  }),

  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}",
    summary: "Get one ledger",
    description:
      "Metadata for a single ledger: description, visibility, default branch, and the caller's permissions on it.",
    params: ledgerPathSchema,
    responses: {
      200: json("The ledger"),
    },
    handler: async ({ layers }, { identity, params }) =>
      layers.workflows.ledger.getLedger({
        ledgerId: ledgerIdOf(params),
        userId: identity.userId,
      }),
  }),
] as const;
