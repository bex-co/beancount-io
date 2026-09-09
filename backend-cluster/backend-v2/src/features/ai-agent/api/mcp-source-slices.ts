import { z } from "zod";
import {
  deleteSliceInput,
  deleteSlicesInput,
  updateSliceInput,
  deleteSliceResult,
  deleteSlicesResult,
  updateSliceResult,
} from "@/features/ledger/api/rest/v1/source-slice-handler";
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

export const sourceSliceInput = z
  .object({
    operation: z.enum(["delete", "delete_many", "update"]),
    ledger: ledgerSelection,
    entryHash: z.string().optional(),
    sha256sum: z.string().optional(),
    newContent: z.string().optional(),
    entries: z.array(deleteSliceInput).optional(),
  })
  .strict()
  .superRefine(({ operation, ledger: _ledger, ...args }, ctx) => {
    const schema =
      operation === "delete"
        ? deleteSliceInput
        : operation === "delete_many"
          ? deleteSlicesInput
          : updateSliceInput;
    const result = schema.safeParse(args);
    if (!result.success)
      for (const issue of result.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
  });
export const sourceSliceOutput = mcpOutputSchema(
  toolOutputSchema(
    z.union([
      withWriteOutcome(updateSliceResult.shape),
      withWriteOutcome(deleteSliceResult.shape),
      withWriteOutcome(deleteSlicesResult.shape),
    ]),
  ),
);
export async function executeSourceSlice(
  context: McpRequestContext,
  input: z.infer<typeof sourceSliceInput>,
) {
  const { operation, ledger, ...args } = sourceSliceInput.parse(input);
  const ledgerId = resolveMcpLedger(context, ledger);
  const base = { identity: context.identity, ledgerId };
  const service = context.services.ledgerJournal;
  const validated = <T extends object>(
    write: () => Promise<T>,
    summarize: (written: T) => string,
    hashes: (written: T) => string[],
  ) =>
    withPostWriteValidation(
      context.services,
      context.identity,
      ledgerId,
      write,
    ).then(({ written, validation }) => ({
      ok: true as const,
      result: {
        summary: summarizeWrite(summarize(written), validation),
        ...written,
        wrote: [],
        entryHashes: hashes(written),
        validation,
      },
    }));
  switch (operation) {
    case "delete": {
      return validated(
        () =>
          service.deleteSourceSlice({
            ...base,
            ...deleteSliceInput.parse(args),
          }),
        (written) => `Deleted entry ${written.entryHash}`,
        (written) => [written.entryHash],
      );
    }
    case "delete_many": {
      const parsed = deleteSlicesInput.parse(args);
      return validated(
        () => service.deleteMultiSourceSlices({ ...base, ...parsed }),
        (written) =>
          `Deleted ${written.deletedCount} ${written.deletedCount === 1 ? "entry" : "entries"}`,
        () => parsed.entries.map((entry) => entry.entryHash),
      );
    }
    case "update": {
      return validated(
        () =>
          service.updateSourceSlice({
            ...base,
            ...updateSliceInput.parse(args),
          }),
        (written) =>
          `Updated entry ${written.entryHash} (new hash ${written.newEntryHash})`,
        (written) => [written.newEntryHash],
      );
    }
  }
}
