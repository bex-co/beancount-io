import { Output } from "ai";
import { z } from "zod";
import { type LLMClient } from "../llm-client";
import {
  type TokenUsage,
  type RecentTransactionExample,
  type TransactionToCategorize,
} from "../../types";
import {
  buildCategorizationPrompt,
  CATEGORIZATION_SYSTEM_PROMPT,
} from "./prompts";

export interface CategorizationSuggestion {
  rowIndex: number;
  targetAccount: string;
  confidence: number;
  reasoning: string;
}

export interface CategorizeTransactionsParams {
  transactions: TransactionToCategorize[];
  existingAccounts: string[];
  recentExamples?: RecentTransactionExample[];
  autoAccounts?: boolean;
}

const categorizationSchema = z.object({
  rowIndex: z.number().describe("Row index from the input transactions"),
  targetAccount: z
    .string()
    .describe("Suggested Beancount account (e.g., Expenses:Food:Coffee)"),
  confidence: z.number().describe("Confidence score from 0.0 to 1.0"),
  reasoning: z.string().describe("Brief explanation for the categorization"),
});

const categorizationsResponseSchema = z.object({
  suggestions: z
    .array(categorizationSchema)
    .describe("Array of categorization suggestions"),
});

export async function categorizeTransactions(
  llmClient: LLMClient,
  {
    transactions,
    existingAccounts,
    recentExamples = [],
    autoAccounts = false,
  }: CategorizeTransactionsParams,
): Promise<{
  suggestions: CategorizationSuggestion[];
  tokenUsage: TokenUsage;
}> {
  const prompt = buildCategorizationPrompt({
    transactions,
    existingAccounts,
    recentExamples,
    autoAccounts,
  });

  const result = await llmClient.generate({
    system: CATEGORIZATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    output: Output.object({
      schema: categorizationsResponseSchema,
    }),
  });

  return {
    suggestions: result.output?.suggestions || [],
    tokenUsage: {
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
    },
  };
}
