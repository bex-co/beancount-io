import { z } from "zod";
import {
  deleteSliceInput,
  deleteSlicesInput,
  updateSliceInput,
  deleteSliceResult,
  deleteSlicesResult,
  updateSliceResult,
} from "@/features/ledger/api/rest/v1/source-slice-handler";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import {
  mcpOutputSchema,
  toolOutputSchema,
  withWriteOutcome,
} from "../tools/types";
import {
  summarizeWrite,
  withPostWriteValidation,
} from "../tools/write-validation";
import {
  resolveMcpLedger,
  ledgerSelection,
  type McpRequestContext,
} from "./mcp-context";

/**
 * MCP keeps its file-tool snake-case spelling for the preview flag while
 * REST spells it dryRun (same split the add/append paths ship; w23/m7/t003).
 */
const dryRunInput = {
  dry_run: z
    .boolean()
    .optional()
    .describe("Run every check and return the preview without committing"),
} as const;

/** One MCP tool per entry-source operation (ADR 019, 2026-10-18; w1/m38). */
export const SOURCE_SLICE_OPERATION_SCHEMAS = {
  update: updateSliceInput
    .omit({ dryRun: true })
    .extend({ ledger: ledgerSelection, ...dryRunInput }),
  delete: deleteSliceInput
    .omit({ dryRun: true })
    .extend({ ledger: ledgerSelection, ...dryRunInput }),
  delete_many: deleteSlicesInput
    .omit({ dryRun: true })
    .extend({ ledger: ledgerSelection, ...dryRunInput }),
} as const;

const dryRunOutput = { dry_run: z.boolean() } as const;
export const withoutDryRun = <T extends { dryRun: unknown }>(shape: T) => {
  const { dryRun: _camel, ...rest } = shape;
  return rest;
};

/** Each tool publishes only its own result shape, not the union of all three. */
export const SOURCE_SLICE_OPERATION_OUTPUTS = {
  update: mcpOutputSchema(
    toolOutputSchema(
      withWriteOutcome({
        ...withoutDryRun(updateSliceResult.shape),
        ...dryRunOutput,
      }),
    ),
  ),
  delete: mcpOutputSchema(
    toolOutputSchema(
      withWriteOutcome({
        ...withoutDryRun(deleteSliceResult.shape),
        ...dryRunOutput,
      }),
    ),
  ),
  delete_many: mcpOutputSchema(
    toolOutputSchema(
      withWriteOutcome({
        ...withoutDryRun(deleteSlicesResult.shape),
        ...dryRunOutput,
      }),
    ),
  ),
} as const;
/**
 * Runs one entry-source write, then reports it the way every write tool does:
 * a summary, the result, the touched entry hashes, and bean-check's verdict.
 */
function validated<T extends { files: string[]; dryRun: boolean }>(
  context: McpRequestContext,
  ledgerId: string,
  write: () => Promise<T>,
  summarize: (written: T) => string,
  hashes: (written: T) => string[],
) {
  return withPostWriteValidation(
    context.services,
    context.identity,
    ledgerId,
    write,
  ).then(({ written, validation }) => {
    // The service spells the echo dryRun; MCP publishes dry_run (w23/m7/t003).
    const { files, dryRun, ...result } = written;
    return {
      ok: true as const,
      result: {
        summary: summarizeWrite(summarize(written), validation),
        ...result,
        dry_run: dryRun,
        // The files the ledger rewrote; this was always empty (w23/042).
        wrote: [...new Set(files)].map((path) => ({ path })),
        entryHashes: hashes(written),
        validation,
      },
    };
  });
}

/** Each tool's handler, parsing the schema that tool publishes. */
export const SOURCE_SLICE_EXECUTORS = {
  update: (context: McpRequestContext, input: unknown) => {
    const { ledger, ...args } =
      SOURCE_SLICE_OPERATION_SCHEMAS.update.parse(input);
    const ledgerId = resolveMcpLedger(context, ledger);
    const entryHash = resolveEntryHash(args);
    return validated(
      context,
      ledgerId,
      () =>
        context.services.ledgerJournal.updateSourceSlice({
          identity: context.identity,
          ledgerId,
          entryHash,
          sha256sum: args.sha256sum,
          newContent: args.newContent,
          allowInvalid: args.allowInvalid,
          dryRun: args.dry_run,
        }),
      // The service returns the new hash in `entryHash` too, so the old one
      // comes from the request (w23/007).
      (written) =>
        written.dryRun
          ? `Would update entry ${entryHash} (new hash ${written.newEntryHash})`
          : `Updated entry ${entryHash} (new hash ${written.newEntryHash})`,
      (written) => [written.newEntryHash],
    );
  },
  delete: (context: McpRequestContext, input: unknown) => {
    const { ledger, ...args } =
      SOURCE_SLICE_OPERATION_SCHEMAS.delete.parse(input);
    const ledgerId = resolveMcpLedger(context, ledger);
    const entryHash = resolveEntryHash(args);
    return validated(
      context,
      ledgerId,
      () =>
        context.services.ledgerJournal.deleteSourceSlice({
          identity: context.identity,
          ledgerId,
          entryHash,
          sha256sum: args.sha256sum,
          allowInvalid: args.allowInvalid,
          dryRun: args.dry_run,
        }),
      (written) =>
        written.dryRun
          ? `Would delete entry ${written.entryHash}`
          : `Deleted entry ${written.entryHash}`,
      (written) => [written.entryHash],
    );
  },
  delete_many: (context: McpRequestContext, input: unknown) => {
    const { ledger, entries, allowInvalid, dry_run } =
      SOURCE_SLICE_OPERATION_SCHEMAS.delete_many.parse(input);
    const ledgerId = resolveMcpLedger(context, ledger);
    const resolved = entries.map((entry) => ({
      entryHash: resolveEntryHash(entry),
      sha256sum: entry.sha256sum,
    }));
    return validated(
      context,
      ledgerId,
      () =>
        context.services.ledgerJournal.deleteMultiSourceSlices({
          identity: context.identity,
          ledgerId,
          entries: resolved,
          allowInvalid,
          dryRun: dry_run,
        }),
      (written) => {
        const noun = written.deletedCount === 1 ? "entry" : "entries";
        return written.dryRun
          ? `Would delete ${written.deletedCount} ${noun}`
          : `Deleted ${written.deletedCount} ${noun}`;
      },
      // A hash sent twice deletes one entry; it is reported once (w23/042).
      () => [...new Set(resolved.map((entry) => entry.entryHash))],
    );
  },
};
