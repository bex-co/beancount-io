import { z } from "zod";
import {
  ledgerCreateInput,
  ledgerUpdateInput,
  ledgerDeleteInput,
  ledgerResultSchema,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import { type McpRequestContext, resolveMcpLedger } from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
import { BadUserInputError } from "@/shared/errors";
export const lifecycleToolInput = z
  .object({
    operation: z.enum(["create", "update", "delete"]),
    ledger: z
      .string()
      .optional()
      .describe(
        "Existing ledger as owner/name. For update/delete only; unpinned credentials must specify it.",
      ),
    name: ledgerUpdateInput.shape.name,
    description: ledgerUpdateInput.shape.description,
    private: ledgerUpdateInput.shape.private,
    template: ledgerCreateInput.shape.template,
  })
  .strict();
export const lifecycleToolOutput = mcpOutputSchema(
  toolOutputSchema(
    z.union([ledgerResultSchema, z.object({ ledgerId: z.string() })]),
  ),
);
export async function executeLifecycleTool(
  context: McpRequestContext,
  input: z.infer<typeof lifecycleToolInput>,
) {
  const { operation, ledger, ...payload } = lifecycleToolInput.parse(input);
  const identity = context.identity;
  if (operation === "create") {
    if (ledger !== undefined)
      throw new BadUserInputError(
        "Creation uses the authenticated user's account; omit ledger and provide name.",
      );
    return {
      ok: true,
      result: await context.ledgerWorkflow.createLedger({
        identity,
        input: ledgerCreateInput.parse(payload),
      }),
    };
  }
  const ledgerId = resolveMcpLedger(context, ledger);
  if (operation === "update")
    return {
      ok: true,
      result: await context.ledgerWorkflow.updateLedger({
        identity,
        ledgerId,
        input: ledgerUpdateInput.parse(payload),
      }),
    };
  ledgerDeleteInput.parse(payload);
  return {
    ok: true,
    result: await context.ledgerWorkflow.deleteLedger({ identity, ledgerId }),
  };
}
