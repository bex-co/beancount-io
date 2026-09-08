import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, type LanguageModel } from "ai";
import {
  LoadAPIKeyError,
  type LanguageModelV4,
  type LanguageModelV4CallOptions,
} from "@ai-sdk/provider";
import { logger } from "@/shared/logger";

const fallbackLogger = logger.child({ module: "fallback-language-model" });

function isNonRetriableError(err: unknown): boolean {
  return APICallError.isInstance(err) && !err.isRetryable;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Creates an Anthropic → OpenAI fallback LanguageModel.
 *
 * Each provider goes direct to the real API when its key is set —
 * `ANTHROPIC_API_KEY` (createAnthropic defaults to api.anthropic.com) and
 * `OPENAI_API_KEY` (createOpenAI defaults to api.openai.com) — otherwise it is
 * routed through the BlockEden gateway with `accessKey` in the URL path. A
 * provider is only included when it has usable credentials, so the fallback
 * order (Anthropic → OpenAI) is preserved. Connection-level failures (rate
 * limits, server errors) are caught before streaming begins, so the next
 * provider is tried transparently.
 */
export function createFallbackLanguageModel(accessKey: string): LanguageModel {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const providers: LanguageModelV4[] = [];

  // Anthropic (primary): direct when ANTHROPIC_API_KEY is set, else via
  // BlockEden.
  if (anthropicKey) {
    providers.push(createAnthropic({ apiKey: anthropicKey })(ANTHROPIC_MODEL));
  } else if (accessKey) {
    providers.push(
      createAnthropic({
        baseURL: `https://api.blockeden.xyz/anthropic/${accessKey}/v1`,
        apiKey: "not-needed",
      })(ANTHROPIC_MODEL),
    );
  }

  // OpenAI (fallback): direct when OPENAI_API_KEY is set, else via BlockEden.
  if (openaiKey) {
    providers.push(createOpenAI({ apiKey: openaiKey })("gpt-4o"));
  } else if (accessKey) {
    providers.push(
      createOpenAI({
        baseURL: `https://api.blockeden.xyz/openai/${accessKey}/v1`,
        apiKey: "not-needed",
      })("gpt-4o"),
    );
  }

  if (providers.length === 0) {
    throw new LoadAPIKeyError({
      message:
        "LLM is not configured. Set ANTHROPIC_API_KEY / OPENAI_API_KEY, or BLOCKEDEN_ACCESS_KEY.",
    });
  }

  const primary = providers[0];

  const model: LanguageModelV4 = {
    specificationVersion: "v4",
    get provider() {
      return primary.provider;
    },
    get modelId() {
      return primary.modelId;
    },
    get supportedUrls() {
      return primary.supportedUrls;
    },

    async doGenerate(options: LanguageModelV4CallOptions) {
      let lastError: unknown;
      for (let i = 0; i < providers.length; i++) {
        const p = providers[i];
        const isLast = i === providers.length - 1;
        try {
          return await p.doGenerate(options);
        } catch (err) {
          if (isLast && isNonRetriableError(err)) throw err;
          fallbackLogger.warn(
            "LLM provider failed in doGenerate, trying next",
            {
              modelId: p.modelId,
              error: err,
            },
          );
          lastError = err;
        }
      }
      throw lastError;
    },

    async doStream(options: LanguageModelV4CallOptions) {
      let lastError: unknown;
      for (let i = 0; i < providers.length; i++) {
        const p = providers[i];
        const isLast = i === providers.length - 1;
        try {
          return await p.doStream(options);
        } catch (err) {
          if (isLast && isNonRetriableError(err)) throw err;
          fallbackLogger.warn("LLM provider failed in doStream, trying next", {
            modelId: p.modelId,
            error: err,
          });
          lastError = err;
        }
      }
      throw lastError;
    },
  };

  return model as LanguageModel;
}
