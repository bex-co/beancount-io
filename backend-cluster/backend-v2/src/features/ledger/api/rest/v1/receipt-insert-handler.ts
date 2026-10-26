import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
import { resolveObjectKey } from "@/features/ledger/utils/object-key-alias";

const receiptPostingSchema = z
  .object({
    account: z.string(),
    amountNumber: z.string().describe("Decimal amount string, e.g. '25.50'"),
    amountCurrency: z.string(),
  })
  .strict();

export const receiptInsertInput = z
  .object({
    receiptObjectKey: z
      .string()
      .optional()
      .describe("Caller-owned temporary object key (starts with tmp/)"),
    // Twins (w23/m11/t003): every key spelling works at every input.
    objectKey: z
      .string()
      .optional()
      .describe("Alias of receiptObjectKey, as the upload URL spells it."),
    s3ObjectKey: z
      .string()
      .optional()
      .describe("Alias of receiptObjectKey, as the parse routes spell it."),
    input: z
      .object({
        date: z.string(),
        payee: z.string(),
        description: z.string(),
        postings: z.array(receiptPostingSchema),
        documentAccount: z
          .string()
          .describe("Account the stored receipt document attaches to"),
      })
      .strict(),
  })
  .strict();

const receiptInsertResult = z.object({
  success: z.boolean(),
  entryHashes: z.array(z.string()).openapi({
    description:
      "The hash each committed entry now carries, in request order — what getEntryContext, the source-slice update and delete take. Empty when the hashes could not be resolved after the commit.",
  }),
});

export const receiptInsertRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/import/insert-receipt",
  summary: "Insert a receipt-linked transaction",
  description:
    "Promote the caller-owned temporary receipt into the ledger's configured receipt storage (S3 or git, per the receipt_storage beancountio-option) and append the confirmed transaction — plus its document directive under git storage — in one operation. Requires current content and asset write authority. No preview.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: receiptInsertInput,
  responses: { 200: json("Insertion result", receiptInsertResult) },
  handler: async ({ layers }, { identity, params, body }) => {
    const result =
      await layers.workflows.ledgerReceipt.insertReceiptTransaction({
        ledgerId: ledgerIdOf(params),
        receiptObjectKey: resolveObjectKey(body),
        input: body.input,
        identity,
      });
    // The workflow also reports which files the entries landed in for MCP's
    // write outcome; v1 adds only the hashes, as for bulk adds (w23/060).
    return { success: result.success, entryHashes: result.entryHashes ?? [] };
  },
});
