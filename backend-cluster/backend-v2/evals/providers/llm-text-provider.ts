import type {
  ApiProvider,
  CallApiContextParams,
  ProviderResponse,
} from "promptfoo";
import { LLMClient } from "../../src/features/llm/utils/llm-client";

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
    const accessKey = process.env.BLOCKEDEN_ACCESS_KEY;
    if (!accessKey) {
      return { error: "BLOCKEDEN_ACCESS_KEY is required to run LLM evals" };
    }
    try {
      const client = new LLMClient(accessKey);
      const result = await client.generate({
        messages: [{ role: "user", content: prompt }],
      });
      return { output: result.text };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
