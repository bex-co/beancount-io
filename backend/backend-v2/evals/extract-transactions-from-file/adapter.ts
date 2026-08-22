import {
  buildTransactionTextAnalysisPrompt,
  buildTransactionImageAnalysisPrompt,
} from "../../src/features/llm/utils/extract-transactions-from-file/prompts";
import { classifyFile } from "../../src/features/llm/utils/media-type-utils";

/**
 * promptfoo prompt function — display-only. Renders the real prompt template so
 * the CLI/web viewer shows exactly what's sent to the model; the eval provider
 * (evals/providers/llm-workflow-provider.ts) calls extractTransactionsFromFile()
 * directly and ignores this return value.
 */
export default function renderPrompt(context: {
  vars: {
    params: {
      format: string;
      mediaType?: string;
      fileContent?: string;
      imagePath?: string;
    };
  };
}): string {
  const { format, mediaType, fileContent, imagePath } = context.vars.params;
  const category = classifyFile(format, mediaType);
  if (category === "text") {
    return buildTransactionTextAnalysisPrompt(format, fileContent ?? "");
  }
  return `${buildTransactionImageAnalysisPrompt()}\n\n[image fixture: ${imagePath}]`;
}
