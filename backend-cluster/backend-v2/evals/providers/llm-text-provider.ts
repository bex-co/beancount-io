import type {
  ApiProvider,
  CallApiContextParams,
  ProviderResponse,
} from "promptfoo";
import { LLMClient } from "../../src/features/llm/utils/llm-client";
import { isLlmConfigured } from "../../src/features/llm/utils/fallback-language-model";

/**
 * Free-text completion provider reusing the same BlockEden-proxied model as
 * production (no Zod output schema). Used as the llm-rubric grading/judge
 * provider so evals need no separate judge API key.
 */
export default class LlmTextProvider implements ApiProvider {
  id(): string {
    return "llm-text";
  }

  async callApi(
    prompt: string,
    _context?: CallApiContextParams,
  ): Promise<ProviderResponse> {
    if (!isLlmConfigured()) {
      return {
        error: "ANTHROPIC_API_KEY or OPENAI_API_KEY is required to run LLM evals",
      };
    }
    try {
      const client = new LLMClient();
      const result = await client.generate({
        messages: [{ role: "user", content: prompt }],
      });
      return { output: result.text };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
