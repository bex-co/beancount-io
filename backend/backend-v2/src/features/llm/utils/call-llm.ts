import { Output, type ModelMessage } from "ai";
import { z } from "zod";
import type { LLMClient } from "./llm-client";
import type { ExtractTransactionsResult } from "../types";

const transactionSchema = z.object({
  date: z.string().describe("Transaction date in YYYY-MM-DD format"),
  payee: z.string().describe("Merchant or entity name"),
  description: z.string().describe("Transaction details or memo"),
  amount: z
    .number()
    .describe(
      "Transaction amount (negative for expenses, positive for income)",
    ),
});

const transactionsResponseSchema = z.object({
  transactions: z
    .array(transactionSchema)
    .describe("Array of extracted transactions"),
});

// Permissive variant for sources (e.g. receipts) where a date may not be
// visible. The model is allowed to omit `date` rather than fabricate one.
const receiptTransactionSchema = transactionSchema.extend({
  date: z
    .string()
    .optional()
    .describe(
      "Transaction date in YYYY-MM-DD format — omit if no date is clearly visible",
    ),
});

const receiptTransactionsResponseSchema = z.object({
  transactions: z
    .array(receiptTransactionSchema)
    .describe("Array of extracted transactions"),
});

export async function callLLM({
  llmClient,
  system,
  messages,
  dateOptional = false,
}: {
  llmClient: LLMClient;
  system: string;
  messages: ModelMessage[];
  dateOptional?: boolean;
}): Promise<ExtractTransactionsResult> {
  const result = await llmClient.generate({
    system,
    messages,
    maxOutputTokens: 4096,
    output: Output.object({
      schema: dateOptional
        ? receiptTransactionsResponseSchema
        : transactionsResponseSchema,
    }),
  });

  return {
    // Normalize a missing date to "" so ParsedTransaction.date stays a string;
    // the receipt service maps "" to null at its DTO boundary.
    transactions: (result.output?.transactions ?? []).map((t) => ({
      ...t,
      date: t.date ?? "",
    })),
    tokenUsage: {
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
    },
  };
}
