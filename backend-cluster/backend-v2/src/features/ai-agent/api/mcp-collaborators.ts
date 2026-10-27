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
import {
  mcpOutputSchema,
  toolOutputSchema,
  mcpDryRunTwins,
  withMcpDryRunEcho,
} from "../tools/types";
import { previewFlagInput } from "@/features/ledger/utils/flag-alias";

/** One MCP tool per collaborator operation (ADR 019, 2026-10-18; w1/m38). */
export const COLLABORATOR_OPERATION_SCHEMAS = {
  update: collaboratorUpdateInput.extend({
    ledger: ledgerSelection,
    permission: collaboratorUpdateInput.shape.permission.describe(
      "read, write, or admin; omitted or null uses the repository default.",
    ),
    ...mcpDryRunTwins,
  }),
  delete: collaboratorDeleteInput.extend({
    ledger: ledgerSelection,
    ...mcpDryRunTwins,
  }),
  leave: collaboratorLeaveInput.extend({
    ledger: ledgerSelection,
    ...mcpDryRunTwins,
  }),
} as const;

export const collaboratorToolOutput = mcpOutputSchema(
  toolOutputSchema(
    collaboratorResultSchema
      .omit({ dryRun: true })
      .extend({ dry_run: z.boolean().optional() }),
  ),
);

function target(context: McpRequestContext, ledger: string | undefined) {
  return {
    identity: context.identity,
    ledgerId: resolveMcpLedger(context, ledger),
  };
}

/** Each tool's handler, parsing the schema that tool publishes. */
export const COLLABORATOR_EXECUTORS = {
  update: async (context: McpRequestContext, input: unknown) => {
    const { ledger, collaborator, permission, dry_run, dryRun } =
      COLLABORATOR_OPERATION_SCHEMAS.update.parse(input);
    const result =
      await context.collaboratorsWorkflow.addOrUpdateCollaborator({
        ...target(context, ledger),
        collaborator,
        permission: permission ?? undefined,
        input: previewFlagInput({ dry_run, dryRun }),
      });
    return { ok: true, result: withMcpDryRunEcho(result) };
  },
  delete: async (context: McpRequestContext, input: unknown) => {
    const { ledger, collaborator, dry_run, dryRun } =
      COLLABORATOR_OPERATION_SCHEMAS.delete.parse(input);
    const result = await context.collaboratorsWorkflow.deleteCollaborator({
      ...target(context, ledger),
      collaborator,
      input: previewFlagInput({ dry_run, dryRun }),
    });
    return { ok: true, result: withMcpDryRunEcho(result) };
  },
  leave: async (context: McpRequestContext, input: unknown) => {
    const { ledger, dry_run, dryRun } =
      COLLABORATOR_OPERATION_SCHEMAS.leave.parse(input);
    const result = await context.collaboratorsWorkflow.leaveLedger({
      ...target(context, ledger),
      input: previewFlagInput({ dry_run, dryRun }),
    });
    return { ok: true, result: withMcpDryRunEcho(result) };
  },
};
