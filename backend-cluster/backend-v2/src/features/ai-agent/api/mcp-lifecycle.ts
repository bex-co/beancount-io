import { z } from "zod";
import {
  ledgerCreateInput,
  ledgerUpdateInput,
  ledgerDeleteInput,
  ledgerDeleteResultSchema,
  ledgerPreviewInput,
  ledgerPreviewResultSchema,
  ledgerResultSchema,
} from "@/features/ledger/api/rest/v1/lifecycle-handler";
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import {
  type McpRequestContext,
  ledgerSelection,
  resolveMcpLedger,
} from "./mcp-context";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
/**
 * One MCP tool per lifecycle operation (ADR 019, 2026-10-18; w1/m38), each
 * taking exactly REST's input for that operation plus the ledger target.
 */
export const LIFECYCLE_OPERATION_SCHEMAS = {
  create: ledgerCreateInput,
  preview: ledgerPreviewInput,
  update: ledgerUpdateInput.extend({
    ledger: ledgerSelection,
    // MCP-worded twins (w23/m9/t002): dry_run is primary here, dryRun the
    // alias — the reverse of REST's wording, which this overrides.
    dry_run: z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION),
    dryRun: z
      .boolean()
      .optional()
      .describe("Alias of dry_run, as REST and GraphQL spell it."),
  }),
  delete: ledgerDeleteInput.extend({
    ledger: ledgerSelection,
    // MCP-worded twins (w23/m9/t002): dry_run is primary here, dryRun the
    // alias — the reverse of REST's wording, which this overrides.
    dry_run: z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION),
    dryRun: z
      .boolean()
      .optional()
      .describe("Alias of dry_run, as REST and GraphQL spell it."),
  }),
} as const;
export const lifecycleToolOutput = mcpOutputSchema(
  toolOutputSchema(
    z.union([ledgerResultSchema, z.object({ ledgerId: z.string() })]),
  ),
);

/**
 * updateLedger's own MCP output (w23/m13/t002): the ledger shape echoing
 * `dry_run` instead of REST's `dryRun`, like every m7 content preview —
 * one preview dialect on MCP, not one per tool family.
 */
export const updateLedgerToolOutput = mcpOutputSchema(
  toolOutputSchema(
    ledgerResultSchema
      .omit({ dryRun: true })
      .extend({ dry_run: z.boolean().optional() }),
  ),
);

/**
 * deleteLedger's own MCP output (w23/m13/t003): the delete result echoing
 * `dry_run` instead of REST's `dryRun`, like every m7 content preview.
 */
export const deleteLedgerToolOutput = mcpOutputSchema(
  toolOutputSchema(
    ledgerDeleteResultSchema
      .omit({ dryRun: true })
      .extend({ dry_run: z.boolean().optional() }),
  ),
);
export const previewToolOutput = mcpOutputSchema(
  toolOutputSchema(ledgerPreviewResultSchema),
);

/** Each tool's handler, parsing the schema that tool publishes. */
export const LIFECYCLE_EXECUTORS = {
  create: async (context: McpRequestContext, input: unknown) => ({
    ok: true,
    result: await context.ledgerWorkflow.createLedger({
      identity: context.identity,
      input: LIFECYCLE_OPERATION_SCHEMAS.create.parse(input),
      platform: context.platform,
    }),
  }),
  preview: async (context: McpRequestContext, input: unknown) => ({
    ok: true,
    result: await context.ledgerWorkflow.previewLedgerSetup({
      identity: context.identity,
      setup: LIFECYCLE_OPERATION_SCHEMAS.preview.parse(input).setup,
    }),
  }),
  update: async (context: McpRequestContext, input: unknown) => {
    const { ledger, dry_run, dryRun, ...payload } =
      LIFECYCLE_OPERATION_SCHEMAS.update.parse(input);
    const result = await context.ledgerWorkflow.updateLedger({
      identity: context.identity,
      ledgerId: resolveMcpLedger(context, ledger),
      input: {
        ...payload,
        dryRun: resolveFlagAlias(
          { primary: dry_run, legacy: dryRun },
          DRY_RUN_NAMES,
        ),
      },
    });
    // The MCP output echoes dry_run, not the workflow's dryRun (w23/m13/t002).
    const { dryRun: echoed, ...rest } = result;
    return { ok: true, result: { ...rest, dry_run: echoed } };
  },
  delete: async (context: McpRequestContext, input: unknown) => {
    const { ledger, dry_run, dryRun } =
      LIFECYCLE_OPERATION_SCHEMAS.delete.parse(input);
    const result = await context.ledgerWorkflow.deleteLedger({
      identity: context.identity,
      ledgerId: resolveMcpLedger(context, ledger),
      input: {
        dryRun: resolveFlagAlias(
          { primary: dry_run, legacy: dryRun },
          DRY_RUN_NAMES,
        ),
      },
    });
    // The MCP output echoes dry_run, not the workflow's dryRun (w23/m13/t003).
    const { dryRun: echoed, ...rest } = result;
    return { ok: true, result: { ...rest, dry_run: echoed } };
  },
};
