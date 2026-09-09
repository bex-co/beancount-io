import { generateText } from "ai";
import { probeLlm } from "../llm-probe";
import { createFallbackLanguageModel } from "../fallback-language-model";

jest.mock("ai", () => ({ generateText: jest.fn() }));
jest.mock("../fallback-language-model", () => ({
  isLlmConfigured: jest.fn(),
  createFallbackLanguageModel: jest.fn(() => ({ modelId: "stub" })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isLlmConfigured } = require("../fallback-language-model") as {
  isLlmConfigured: jest.Mock;
};

/**
 * The probe distinguishes unconfigured (quiet, legitimate) from
 * configured-but-broken (loud), and must never throw — it is diagnostics, not
 * a request path (w2/m30/t005).
 */
describe("probeLlm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("skips without touching the model when no provider is configured", async () => {
    isLlmConfigured.mockReturnValue(false);

    await expect(probeLlm()).resolves.toEqual({ status: "skipped" });
    expect(createFallbackLanguageModel).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("reports ok with a latency when the model responds", async () => {
    isLlmConfigured.mockReturnValue(true);
    (generateText as jest.Mock).mockResolvedValue({ text: "ok" });
    let t = 1000;
    const now = () => (t += 25);

    await expect(probeLlm(now)).resolves.toEqual({
      status: "ok",
      latencyMs: 25,
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("reports failed instead of throwing when the model errors", async () => {
    isLlmConfigured.mockReturnValue(true);
    (generateText as jest.Mock).mockRejectedValue(new Error("bad key"));

    await expect(probeLlm()).resolves.toMatchObject({
      status: "failed",
      error: "bad key",
    });
  });
});
