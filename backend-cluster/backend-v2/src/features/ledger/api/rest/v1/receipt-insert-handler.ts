import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";

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
      .describe("Caller-owned temporary object key (starts with tmp/)"),
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

export const receiptInsertResult = z.object({ success: z.boolean() });

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
  handler: ({ layers }, { identity, params, body }) =>
    layers.workflows.ledgerReceipt.insertReceiptTransaction({
      ledgerId: ledgerIdOf(params),
      receiptObjectKey: body.receiptObjectKey,
      input: body.input,
      identity,
    }),
});
