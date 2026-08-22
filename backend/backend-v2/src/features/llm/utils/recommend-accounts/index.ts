import { Output } from "ai";
import { z } from "zod";
import { type LLMClient } from "../llm-client";
import {
  type TokenUsage,
  type ParsedTransaction,
  type AccountRecommendation,
} from "../../types";
import {
  buildAccountRecommendationSystemPrompt,
  buildAccountRecommendationUserPrompt,
} from "./prompts";

const accountRecommendationSchema = z.object({
  sourceAccount: z
    .string()
    .nullable()
    .describe(
      "Account money comes FROM (e.g. Assets:Cash, Liabilities:CreditCard:Visa). Use null if no suitable account exists.",
    ),
  targetAccount: z
    .string()
    .nullable()
    .describe(
      "Account money goes TO (e.g. Expenses:Food:Groceries, Income:Salary). Use null if no suitable account exists.",
    ),
  confidence: z
    .number()
    .describe("Confidence score from 0.0 (very uncertain) to 1.0 (certain)."),
  reasoning: z
    .string()
    .describe("One-sentence explanation of why these accounts were chosen."),
});

export async function recommendAccounts(
  llmClient: LLMClient,
  transaction: ParsedTransaction,
  accounts: string[],
): Promise<{ recommendation: AccountRecommendation; tokenUsage: TokenUsage }> {
  const result = await llmClient.generate({
    system: buildAccountRecommendationSystemPrompt(),
    messages: [
      {
        role: "user" as const,
        content: buildAccountRecommendationUserPrompt(
          transaction.date,
          transaction.payee,
          transaction.description,
          transaction.amount,
          accounts,
        ),
      },
    ],
    temperature: 0.2,
    output: Output.object({ schema: accountRecommendationSchema }),
  });

  const recommendation = result.output ?? {
    confidence: 0,
    reasoning: "LLM returned no output.",
  };
  return {
    recommendation,
    tokenUsage: {
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
    },
  };
}
