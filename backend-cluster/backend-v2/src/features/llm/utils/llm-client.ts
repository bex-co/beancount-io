import { generateText, type GenerateTextResult, type ToolSet } from "ai";
import { logger } from "@/shared/logger";
import { createFallbackLanguageModel } from "../utils/fallback-language-model";

const llmLogger = logger.child({ module: "llm-client" });

type GenerateTextParams = Parameters<typeof generateText>[0];

// Derive the Output interface type from generateText's params without importing the
// Output namespace (which TypeScript treats as a namespace value, not a type).
type OutputType = NonNullable<Parameters<typeof generateText>[0]["output"]>;
type BaseParams = Omit<Parameters<typeof generateText>[0], "model" | "output">;

/**
 * LLM client with automatic provider fallback (Anthropic → OpenAI).
 * Fallback is handled inside the LanguageModel returned by createFallbackLanguageModel.
 */
export class LLMClient {
  private readonly model: ReturnType<typeof createFallbackLanguageModel>;

  constructor(accessKey: string) {
    this.model = createFallbackLanguageModel(accessKey);
  }

  async generate<OUTPUT extends OutputType>(
    params: BaseParams & { output?: OUTPUT },
  ): Promise<GenerateTextResult<ToolSet, Record<string, unknown>, OUTPUT>> {
    llmLogger.debug("Generating with LLM");
    return (await generateText({
      ...(params as GenerateTextParams),
      model: this.model,
    })) as GenerateTextResult<ToolSet, Record<string, unknown>, OUTPUT>;
  }
}
