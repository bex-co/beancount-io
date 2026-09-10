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

// Model ids are env-configurable so an upgrade is config, not a code change
// (w2/m30/t003). Deliberately NOT named ANTHROPIC_MODEL — that env var is
// claimed by the Path A sandbox harness (sandbox-agent-workflow.ts forwards it
// into Claude Code); sharing would recouple the two paths ADR 0011 separates.
// The primary default is the alias, not a dated snapshot, so it tracks the
// line automatically.
const DEFAULT_PRIMARY_MODEL = "claude-sonnet-4-5";
const DEFAULT_FALLBACK_MODEL = "gpt-4o";

function primaryModelId(): string {
  return process.env.LLM_MODEL || DEFAULT_PRIMARY_MODEL;
}

function fallbackModelId(): string {
  return process.env.LLM_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
}

const NOT_CONFIGURED_MESSAGE =
  "LLM is not configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.";

/**
 * Whether any direct provider credential is present. Callers that want a
 * clean domain error before doing real work (S3 reads, quota checks) test
 * this instead of waiting for the model to fail.
 */
export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Creates an Anthropic → OpenAI fallback LanguageModel from direct provider
 * credentials: `ANTHROPIC_API_KEY` (primary) and `OPENAI_API_KEY` (fallback).
 * A provider is only included when its key is set, so the fallback order is
 * preserved. Connection-level failures (rate limits, server errors) are
 * caught before streaming begins, so the next provider is tried
 * transparently.
 *
 * Construction never throws (ADR 0011): with no key set this returns a model
 * whose calls fail with a clear "not configured" error, so services can be
 * built — and the server can boot — without any LLM credential.
 */
export function createFallbackLanguageModel(): LanguageModel {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const providers: LanguageModelV4[] = [];

  if (anthropicKey) {
    providers.push(createAnthropic({ apiKey: anthropicKey })(primaryModelId()));
  }
  if (openaiKey) {
    providers.push(createOpenAI({ apiKey: openaiKey })(fallbackModelId()));
  }

  if (providers.length === 0) {
    const fail = (): never => {
      throw new LoadAPIKeyError({ message: NOT_CONFIGURED_MESSAGE });
    };
    const unconfigured: LanguageModelV4 = {
      specificationVersion: "v4",
      provider: "unconfigured",
      modelId: primaryModelId(),
      supportedUrls: {},
      doGenerate: async () => fail(),
      doStream: async () => fail(),
    };
    return unconfigured as LanguageModel;
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
