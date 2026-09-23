import { z } from "zod";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";

export const refreshManagedPricesInput = z
  .object({ ledger: ledgerSelection })
  .strict();
// Only the fields an agent acts on are typed; each record carries the rest
// of the `ledgerManagedPrices` resource's shape. Publishing all fourteen here
// would cost ~1.7 KB of every session's tools/list for a schema the resource
// template already documents.
export const refreshManagedPricesOutput = mcpOutputSchema(
  toolOutputSchema(
    z.object({
      sources: z.array(
        z
          .object({
            alias: z.string(),
            freshness: z.enum(["recent", "stale", "unavailable"]),
            error: z.string().nullable(),
          })
          .passthrough(),
      ),
    }),
  ),
);

/**
 * The action twin of the `ledgerManagedPrices` resource: same records, after
 * every feed was made due and re-fetched (ADR 015 §5).
 */
export async function executeRefreshManagedPrices(
  context: McpRequestContext,
  input: z.infer<typeof refreshManagedPricesInput>,
) {
  const { ledger } = refreshManagedPricesInput.parse(input);
  const sources = await context.services.ledgerData.refreshManagedPrices({
    identity: context.identity,
    ledgerId: resolveMcpLedger(context, ledger),
  });
  return { ok: true, result: { sources } };
}
