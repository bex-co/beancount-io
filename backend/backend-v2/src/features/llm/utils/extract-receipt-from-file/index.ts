import type { LLMClient } from "../llm-client";
import { callLLM } from "../call-llm";
import { prepareLlmMessage } from "../prepare-llm-message";
import {
  buildReceiptSystemPrompt,
  buildReceiptAnalysisPrompt,
} from "./prompts";
import { ServiceUnavailableError } from "@/shared/errors";
import { type ParsedTransaction, type TokenUsage } from "../../types";

export async function extractReceiptFromFile({
  llmClient,
  fileUrl,
  format,
  mediaType,
}: {
  llmClient: LLMClient;
  fileUrl: string;
  format: string;
  mediaType?: string;
}): Promise<{ transaction: ParsedTransaction; tokenUsage: TokenUsage }> {
  const { system, messages } = await prepareLlmMessage({
    fileUrl,
    format,
    mediaType,
    prompts: {
      system: () => buildReceiptSystemPrompt(),
      text: () => {
        throw new ServiceUnavailableError(
          "Receipt parsing requires an image or PDF file",
        );
      },
      image: () => buildReceiptAnalysisPrompt(),
      file: () => buildReceiptAnalysisPrompt(),
    },
  });

  const result = await callLLM({
    llmClient,
    system,
    messages,
    dateOptional: true,
  });
  const txn = result.transactions[0];
  if (!txn) {
    throw new ServiceUnavailableError(
      "Receipt parsing (no transaction extracted)",
    );
  }
  return { transaction: txn, tokenUsage: result.tokenUsage };
}
