import { Output } from "ai";
import { z } from "zod";
import { type LLMClient } from "../llm-client";
import {
  type TokenUsage,
  type BankAccountToMap,
  type BankAccountMappingSuggestion,
} from "../../types";
import {
  buildAccountMappingPrompt,
  ACCOUNT_MAPPING_SYSTEM_PROMPT,
} from "./prompts";

export interface SuggestAccountMappingParams {
  institutionName: string;
  accounts: BankAccountToMap[];
  existingAccounts: string[];
  autoAccounts?: boolean;
}

const accountMappingSchema = z.object({
  accountId: z.string().describe("The Plaid account id from the input"),
  suggestedAccount: z
    .string()
    .describe("Suggested Beancount account (e.g., Assets:Wise:USD)"),
  confidence: z.number().describe("Confidence score from 0.0 to 1.0"),
  reasoning: z.string().describe("Brief explanation for the suggestion"),
});

const accountMappingResponseSchema = z.object({
  suggestions: z
    .array(accountMappingSchema)
    .describe("Array of account mapping suggestions"),
});

export async function suggestAccountMapping(
  llmClient: LLMClient,
  {
    institutionName,
    accounts,
    existingAccounts,
    autoAccounts = false,
  }: SuggestAccountMappingParams,
): Promise<{
  suggestions: BankAccountMappingSuggestion[];
  tokenUsage: TokenUsage;
}> {
  const prompt = buildAccountMappingPrompt({
    institutionName,
    accounts,
    existingAccounts,
    autoAccounts,
  });

  const result = await llmClient.generate({
    system: ACCOUNT_MAPPING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    output: Output.object({
      schema: accountMappingResponseSchema,
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
