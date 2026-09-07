import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import {
  ledgerPathSchema,
  ledgerIdOf,
} from "@/features/ledger/api/rest/v1/schemas";
import { jsonQuery } from "@/features/ledger/api/rest/v1/journal-reads";

const transactionToCategorizeSchema = z
  .object({
    rowIndex: z.number().int(),
    date: z.string(),
    payee: z.string(),
    description: z.string(),
    amount: z.number(),
  })
  .strict();

const categorySuggestionSchema = z.object({
  rowIndex: z.number().int(),
  targetAccount: z.string(),
  confidence: z.number(),
  source: z.string(),
  reasoning: z.string().optional(),
});

/** The MCP resource carries the same array as one JSON-encoded query parameter. */
export const suggestCategoriesQuery = z.object({
  transactions: jsonQuery(
    z.array(transactionToCategorizeSchema),
    "JSON-encoded array of {rowIndex, date, payee, description, amount}",
  ),
});

export const suggestCategoriesRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/ledgers/{owner}/{name}/import/suggest-categories",
  summary: "Suggest transaction categories from the ledger",
  description:
    "Suggest a target account for each supplied transaction using the ledger's open accounts and recent transaction history. Requires assisted-categorization authority on the ledger and consumes AI quota. Returns suggestions without writing entries.",
  params: ledgerPathSchema,
  query: z.object({}).strict(),
  body: z
    .object({ transactions: z.array(transactionToCategorizeSchema) })
    .strict(),
  responses: {
    200: json("Category suggestions", z.array(categorySuggestionSchema)),
  },
  handler: ({ layers }, { identity, params, body }) =>
    layers.services.llm.suggestCategories(
      identity,
      ledgerIdOf(params),
      body.transactions,
    ),
});
