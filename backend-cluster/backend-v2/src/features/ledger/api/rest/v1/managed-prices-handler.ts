import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { managedPriceStatusSchema } from "./vocabulary-handler";

/**
 * The manual refresh ADR 015 §5 defers to its first client surface. The
 * status read itself is a vocabulary read (`GET …/managed-prices`); this is
 * its one action, so it answers with the same records.
 */
export const REFRESH_MANAGED_PRICES_ROUTE = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/managed-prices/refresh",
  summary: "Refresh the ledger's managed price feeds",
  description:
    "Make every managed price feed the ledger includes due now, re-fetch each, and return the same status records as `GET …/managed-prices`. Never reads or writes the repository. A failed re-fetch keeps serving the last validated revision and reports the cause in `error`. Requires write capability on the ledger.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: z.object({}).strict().default({}),
  responses: {
    200: json(
      "Managed price status after the refresh",
      managedPriceStatusSchema,
    ),
  },
  handler: async ({ layers }, { identity, params }) =>
    layers.services.ledgerData.refreshManagedPrices({
      identity,
      ledgerId: ledgerIdOf(params),
    }),
});
