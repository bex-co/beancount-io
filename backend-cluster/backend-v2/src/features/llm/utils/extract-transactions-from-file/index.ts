import type { LLMClient } from "../llm-client";
import { callLLM } from "../call-llm";
import type { ExtractTransactionsResult } from "../../types";
import { prepareLlmMessage } from "../prepare-llm-message";
import {
  buildTransactionSystemPrompt,
  buildTransactionTextAnalysisPrompt,
  buildTransactionImageAnalysisPrompt,
  buildTransactionFileAnalysisPrompt,
} from "./prompts";

export async function extractTransactionsFromFile({
  llmClient,
  fileUrl,
  format,
  mediaType,
}: {
  llmClient: LLMClient;
  fileUrl: string;
  format: string;
  mediaType?: string;
}): Promise<ExtractTransactionsResult> {
  const { system, messages } = await prepareLlmMessage({
    fileUrl,
    format,
    mediaType,
    prompts: {
      system: buildTransactionSystemPrompt,
      text: buildTransactionTextAnalysisPrompt,
      image: buildTransactionImageAnalysisPrompt,
      file: buildTransactionFileAnalysisPrompt,
    },
  });
  return callLLM({ llmClient, system, messages });
}
