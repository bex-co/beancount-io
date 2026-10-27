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
import { withResolvedPreview } from "@/features/ledger/utils/flag-alias";
import {
  type McpRequestContext,
  ledgerSelection,
  resolveMcpLedger,
} from "./mcp-context";
import {
  mcpOutputSchema,
  toolOutputSchema,
  mcpDryRunTwins,
  withMcpDryRunEcho,
} from "../tools/types";
/**
 * One MCP tool per lifecycle operation (ADR 019, 2026-10-18; w1/m38), each
 * taking exactly REST's input for that operation plus the ledger target.
 */
export const LIFECYCLE_OPERATION_SCHEMAS = {
  create: ledgerCreateInput,
  preview: ledgerPreviewInput,
  update: ledgerUpdateInput.extend({
    ledger: ledgerSelection,
    ...mcpDryRunTwins,
  }),
  delete: ledgerDeleteInput.extend({
    ledger: ledgerSelection,
    ...mcpDryRunTwins,
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
    const { ledger, ...rest } =
      LIFECYCLE_OPERATION_SCHEMAS.update.parse(input);
    const result = await context.ledgerWorkflow.updateLedger({
      identity: context.identity,
      ledgerId: resolveMcpLedger(context, ledger),
      input: withResolvedPreview(rest),
    });
    return { ok: true, result: withMcpDryRunEcho(result) };
  },
  delete: async (context: McpRequestContext, input: unknown) => {
    const { ledger, ...rest } =
      LIFECYCLE_OPERATION_SCHEMAS.delete.parse(input);
    const result = await context.ledgerWorkflow.deleteLedger({
      identity: context.identity,
      ledgerId: resolveMcpLedger(context, ledger),
      input: withResolvedPreview(rest),
    });
    return { ok: true, result: withMcpDryRunEcho(result) };
  },
};
