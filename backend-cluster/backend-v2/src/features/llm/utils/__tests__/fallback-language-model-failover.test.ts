import { APICallError } from "ai";
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
} from "@ai-sdk/provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createFallbackLanguageModel } from "../fallback-language-model";

jest.mock("@ai-sdk/anthropic", () => ({ createAnthropic: jest.fn() }));
jest.mock("@ai-sdk/openai", () => ({ createOpenAI: jest.fn() }));

/**
 * Pins the failover contract (w2/m30/t002): the Anthropic primary is tried
 * first; any primary failure falls through to the OpenAI fallback; a
 * non-retriable failure on the LAST provider propagates to the caller.
 */

const options = {} as LanguageModelV4CallOptions;

function stubProvider(doGenerate: jest.Mock): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "stub",
    modelId: "stub-model",
    supportedUrls: {},
    doGenerate,
    doStream: jest.fn(),
  } as unknown as LanguageModelV4;
}

function arrange(anthropicGen: jest.Mock, openaiGen: jest.Mock) {
  (createAnthropic as jest.Mock).mockReturnValue(() =>
    stubProvider(anthropicGen),
  );
  (createOpenAI as jest.Mock).mockReturnValue(() => stubProvider(openaiGen));
}

describe("createFallbackLanguageModel failover order", () => {
  const priorOpenai = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-oai-test";
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (priorOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorOpenai;
  });

  it("falls through to the OpenAI provider when the primary fails", async () => {
    const anthropicGen = jest.fn().mockRejectedValue(new Error("primary down"));
    const openaiGen = jest.fn().mockResolvedValue({ ok: true });
    arrange(anthropicGen, openaiGen);

    const model = createFallbackLanguageModel() as unknown as LanguageModelV4;
    await expect(model.doGenerate(options)).resolves.toEqual({ ok: true });

    expect(anthropicGen).toHaveBeenCalledTimes(1);
    expect(openaiGen).toHaveBeenCalledTimes(1);
    expect(anthropicGen.mock.invocationCallOrder[0]).toBeLessThan(
      openaiGen.mock.invocationCallOrder[0],
    );
  });

  it("propagates a non-retriable failure from the last provider", async () => {
    const terminal = new APICallError({
      message: "schema rejected",
      url: "https://api.openai.invalid",
      requestBodyValues: {},
      statusCode: 400,
      isRetryable: false,
    });
    const anthropicGen = jest.fn().mockRejectedValue(new Error("primary down"));
    const openaiGen = jest.fn().mockRejectedValue(terminal);
    arrange(anthropicGen, openaiGen);

    const model = createFallbackLanguageModel() as unknown as LanguageModelV4;
    await expect(model.doGenerate(options)).rejects.toBe(terminal);
  });

  it("uses only the primary when no fallback key is set", async () => {
    delete process.env.OPENAI_API_KEY;
    const anthropicGen = jest.fn().mockResolvedValue({ ok: true });
    const openaiGen = jest.fn();
    arrange(anthropicGen, openaiGen);

    const model = createFallbackLanguageModel() as unknown as LanguageModelV4;
    await expect(model.doGenerate(options)).resolves.toEqual({ ok: true });
    expect(createOpenAI).not.toHaveBeenCalled();
  });

  it("LLM_MODEL / LLM_FALLBACK_MODEL select the provider model ids", () => {
    const anthropicModel = jest.fn().mockReturnValue(stubProvider(jest.fn()));
    const openaiModel = jest.fn().mockReturnValue(stubProvider(jest.fn()));
    (createAnthropic as jest.Mock).mockReturnValue(anthropicModel);
    (createOpenAI as jest.Mock).mockReturnValue(openaiModel);

    const priorPrimary = process.env.LLM_MODEL;
    const priorFallback = process.env.LLM_FALLBACK_MODEL;
    process.env.LLM_MODEL = "claude-custom-1";
    process.env.LLM_FALLBACK_MODEL = "gpt-custom-2";
    try {
      createFallbackLanguageModel();
      expect(anthropicModel).toHaveBeenCalledWith("claude-custom-1");
      expect(openaiModel).toHaveBeenCalledWith("gpt-custom-2");
    } finally {
      if (priorPrimary === undefined) delete process.env.LLM_MODEL;
      else process.env.LLM_MODEL = priorPrimary;
      if (priorFallback === undefined) delete process.env.LLM_FALLBACK_MODEL;
      else process.env.LLM_FALLBACK_MODEL = priorFallback;
    }
  });

  it("defaults the primary to the alias, not a dated snapshot", () => {
    const anthropicModel = jest.fn().mockReturnValue(stubProvider(jest.fn()));
    (createAnthropic as jest.Mock).mockReturnValue(anthropicModel);
    (createOpenAI as jest.Mock).mockReturnValue(() => stubProvider(jest.fn()));

    const prior = process.env.LLM_MODEL;
    delete process.env.LLM_MODEL;
    try {
      createFallbackLanguageModel();
      expect(anthropicModel).toHaveBeenCalledWith("claude-sonnet-4-5");
    } finally {
      if (prior !== undefined) process.env.LLM_MODEL = prior;
    }
  });
});
