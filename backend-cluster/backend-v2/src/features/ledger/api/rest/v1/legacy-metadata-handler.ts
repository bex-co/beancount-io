import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

/** userId is a compatibility argument, never the authenticated subject. */
const legacyMetadataQuery = z.object({
  userId: z
    .string()
    .optional()
    .describe(
      "Legacy compatibility argument; authentication determines the caller",
    ),
  ledgerId: z
    .string()
    .optional()
    .describe(
      "Defaults to the credential pin or the caller's first ledger, matching legacy ledgerMeta",
    ),
});

export const LEGACY_METADATA_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/legacy/ledger-meta",
    summary: "Read legacy ledger metadata",
    description:
      "The legacy ledgerMeta contract: accounts, currencies, error count, and account-name/currency options. The authenticated caller determines the default ledger; userId cannot impersonate another user.",
    query: legacyMetadataQuery,
    responses: { 200: json("Legacy metadata envelope") },
    handler: async ({ layers }, { identity, query }) =>
      layers.workflows.ledger.getLegacyMetadata({
        identity,
        ledgerId: query.ledgerId,
      }),
  }),
];
