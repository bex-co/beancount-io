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
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

// MCP-worded twins (w23/m9/t002): dry_run is primary here, dryRun the
// alias — the reverse of REST's wording, which this overrides.
const dryRunTwins = {
  dry_run: z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION),
  dryRun: z
    .boolean()
    .optional()
    .describe("Alias of dry_run, as REST and GraphQL spell it."),
};

/** One MCP tool per collaborator operation (ADR 019, 2026-10-18; w1/m38). */
export const COLLABORATOR_OPERATION_SCHEMAS = {
  update: collaboratorUpdateInput.extend({
    ledger: ledgerSelection,
    permission: collaboratorUpdateInput.shape.permission.describe(
      "read, write, or admin; omitted or null uses the repository default.",
    ),
    ...dryRunTwins,
  }),
  delete: collaboratorDeleteInput.extend({
    ledger: ledgerSelection,
    ...dryRunTwins,
  }),
  leave: collaboratorLeaveInput.extend({
    ledger: ledgerSelection,
    ...dryRunTwins,
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

function previewInput(dry_run: boolean | undefined, dryRun: boolean | undefined) {
  return {
    dryRun: resolveFlagAlias(
      { primary: dry_run, legacy: dryRun },
      DRY_RUN_NAMES,
    ),
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
        input: previewInput(dry_run, dryRun),
      });
    // The MCP output echoes dry_run, not the workflow's dryRun (w23/m13/t004).
    const { dryRun: echoed, ...rest } = result;
    return { ok: true, result: { ...rest, dry_run: echoed } };
  },
  delete: async (context: McpRequestContext, input: unknown) => {
    const { ledger, collaborator, dry_run, dryRun } =
      COLLABORATOR_OPERATION_SCHEMAS.delete.parse(input);
    const result = await context.collaboratorsWorkflow.deleteCollaborator({
      ...target(context, ledger),
      collaborator,
      input: previewInput(dry_run, dryRun),
    });
    // The MCP output echoes dry_run, not the workflow's dryRun (w23/m13/t004).
    const { dryRun: echoed, ...rest } = result;
    return { ok: true, result: { ...rest, dry_run: echoed } };
  },
  leave: async (context: McpRequestContext, input: unknown) => {
    const { ledger, dry_run, dryRun } =
      COLLABORATOR_OPERATION_SCHEMAS.leave.parse(input);
    const result = await context.collaboratorsWorkflow.leaveLedger({
      ...target(context, ledger),
      input: previewInput(dry_run, dryRun),
    });
    // The MCP output echoes dry_run, not the workflow's dryRun (w23/m13/t004).
    const { dryRun: echoed, ...rest } = result;
    return { ok: true, result: { ...rest, dry_run: echoed } };
  },
};
