import { z } from "zod";
import {
  deleteSliceInput,
  deleteSlicesInput,
  updateSliceInput,
  deleteSliceResult,
  deleteSlicesResult,
  updateSliceResult,
} from "@/features/ledger/api/rest/v1/source-slice-handler";
import { mcpOutputSchema, toolOutputSchema } from "../tools/types";
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
    z.union([updateSliceResult, deleteSliceResult, deleteSlicesResult]),
  ),
);
export async function executeSourceSlice(
  context: McpRequestContext,
  input: z.infer<typeof sourceSliceInput>,
) {
  const { operation, ledger, ...args } = sourceSliceInput.parse(input);
  const base = {
    identity: context.identity,
    ledgerId: resolveMcpLedger(context, ledger),
  };
  const service = context.services.ledgerJournal;
  switch (operation) {
    case "delete":
      return {
        ok: true,
        result: await service.deleteSourceSlice({
          ...base,
          ...deleteSliceInput.parse(args),
        }),
      };
    case "delete_many":
      return {
        ok: true,
        result: await service.deleteMultiSourceSlices({
          ...base,
          ...deleteSlicesInput.parse(args),
        }),
      };
    case "update":
      return {
        ok: true,
        result: await service.updateSourceSlice({
          ...base,
          ...updateSliceInput.parse(args),
        }),
      };
  }
}
