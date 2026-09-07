import { z } from "zod";
import {
  collaboratorUpdateInput,
  collaboratorDeleteInput,
  collaboratorLeaveInput,
  collaboratorResultSchema,
} from "@/features/ledger/api/rest/v1/collaborators-handler";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";

export const collaboratorToolInput = z
  .object({
    operation: z.enum(["update", "delete", "leave"]),
    ledger: ledgerSelection,
    collaborator: z
      .string()
      .optional()
      .describe(
        "Username to add, update, or remove. Required for update/delete; forbidden for leave.",
      ),
    permission: collaboratorUpdateInput.shape.permission.describe(
      "read, write, or admin. Only for update; omitted or null uses the repository default.",
    ),
  })
  .strict();

export const collaboratorToolOutput = mcpOutputSchema(
  toolOutputSchema(collaboratorResultSchema),
);

export async function executeCollaboratorTool(
  context: McpRequestContext,
  input: z.infer<typeof collaboratorToolInput>,
) {
  const { operation, ledger, ...payload } = collaboratorToolInput.parse(input);
  const ledgerId = resolveMcpLedger(context, ledger);
  const workflow = context.collaboratorsWorkflow;
  const target = { identity: context.identity, ledgerId };
  switch (operation) {
    case "update": {
      const data = collaboratorUpdateInput.parse(payload);
      return {
        ok: true,
        result: await workflow.addOrUpdateCollaborator({
          ...target,
          collaborator: data.collaborator,
          permission: data.permission ?? undefined,
        }),
      };
    }
    case "delete":
      return {
        ok: true,
        result: await workflow.deleteCollaborator({
          ...target,
          ...collaboratorDeleteInput.parse(payload),
        }),
      };
    case "leave":
      collaboratorLeaveInput.parse(payload);
      return { ok: true, result: await workflow.leaveLedger(target) };
  }
}
