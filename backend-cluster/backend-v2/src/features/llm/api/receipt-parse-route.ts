import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import {
  ledgerPathSchema,
  ledgerIdOf,
} from "@/features/ledger/api/rest/v1/schemas";

export const receiptParseResult = z.object({
  date: z.string().nullable(),
  payee: z.string(),
  description: z.string(),
  amount: z.number(),
  sourceAccount: z.string().optional(),
  targetAccount: z.string().optional(),
});
export const receiptParseRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/import/parse-receipt",
  summary: "Parse a receipt and recommend ledger accounts",
  description:
    "Parse a caller-owned temporary image or PDF and recommend accounts from the selected ledger. Requires current content and asset read access; consumes extraction and recommendation tokens. No ledger write or preview.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: z.object({ s3ObjectKey: z.string() }).strict(),
  responses: {
    200: json("Parsed receipt and account recommendations", receiptParseResult),
  },
  handler: ({ layers }, { identity, params, body }) =>
    layers.services.llm.parseReceipt(
      identity,
      body.s3ObjectKey,
      ledgerIdOf(params),
    ),
});
