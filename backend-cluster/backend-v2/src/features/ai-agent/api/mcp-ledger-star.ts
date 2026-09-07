import { z } from "zod";
import { starResultSchema } from "@/features/ledger/api/rest/v1/star-handler";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";
export const ledgerStarInput = z
  .object({ starred: z.boolean(), ledger: ledgerSelection })
  .strict();
export const ledgerStarOutput = mcpOutputSchema(
  toolOutputSchema(starResultSchema),
);
export async function executeLedgerStar(
  context: McpRequestContext,
  input: z.infer<typeof ledgerStarInput>,
) {
  const { starred, ledger } = ledgerStarInput.parse(input);
  const result = await context.ledgerWorkflow[
    starred ? "starLedger" : "unstarLedger"
  ]({
    identity: context.identity,
    ledgerId: resolveMcpLedger(context, ledger),
  });
  return result.success
    ? { ok: true, result }
    : { ok: false, error: result.message ?? "Star operation failed", result };
}
