import {
  AUTHORIZATION_ACTIONS,
  AuthorizationUnavailableError,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { createFallbackLanguageModel } from "@/features/llm/utils/fallback-language-model";
import { SelfHostedAgentHandler } from "../self-hosted-agent-handler";

/** The model a deployment with no provider key builds. */
function createUnconfiguredModel() {
  const prior = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    return createFallbackLanguageModel();
  } finally {
    if (prior.anthropic !== undefined)
      process.env.ANTHROPIC_API_KEY = prior.anthropic;
    if (prior.openai !== undefined) process.env.OPENAI_API_KEY = prior.openai;
  }
}

describe("SelfHostedAgentHandler authorization boundary", () => {
  it("denies before quota, model, tools, or stream response work", async () => {
    const unavailable = new AuthorizationUnavailableError(
      AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
    );
    const authorization: IAuthorizationService = {
      authorize: jest.fn(),
      authorizeOrThrow: jest.fn().mockRejectedValue(unavailable),
    };
    const assertQuotaAvailable = jest.fn();
    const model = { doStream: jest.fn() };
    const handler = new SelfHostedAgentHandler(
      model as never,
      { assertQuotaAvailable } as never,
      {} as never,
      {} as never,
      authorization,
    );
    const principal = {
      userId: "usr_1",
      method: "oauth" as const,
      scopes: new Set(["ledger.write"]),
      ledgerScope: "alice/main",
      capabilityExempt: false,
    };

    await expect(
      handler.handle(
        {
          messages: [],
          ledgerId: "alice/main",
          userId: "usr_1",
          services: {} as never,
          identity: principal,
        },
        { setHeader: jest.fn(), write: jest.fn() } as never,
      ),
    ).rejects.toBe(unavailable);

    expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
      principal,
      action: AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
      resource: "ledger:alice/main",
    });
    expect(authorization.authorize).not.toHaveBeenCalled();
    expect(assertQuotaAvailable).not.toHaveBeenCalled();
    expect(model.doStream).not.toHaveBeenCalled();
  });

  // ADR029 D5: with no LLM key the chat refuses before the stream opens, so
  // the REST error middleware answers 503 CONFIGURATION_ERROR with the hint
  // instead of an error part inside a 200 stream.
  it("refuses an unconfigured model as CONFIGURATION_ERROR before quota or streaming", async () => {
    const authorization: IAuthorizationService = {
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
      authorizeOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    const assertQuotaAvailable = jest.fn();
    const res = { setHeader: jest.fn(), write: jest.fn() };
    const handler = new SelfHostedAgentHandler(
      createUnconfiguredModel(),
      { assertQuotaAvailable } as never,
      {} as never,
      {} as never,
      authorization,
    );

    await expect(
      handler.handle(
        {
          messages: [],
          ledgerId: "alice/main",
          userId: "usr_1",
          services: {} as never,
          identity: {
            userId: "usr_1",
            method: "oauth" as const,
            scopes: new Set(["ledger.write"]),
            ledgerScope: "alice/main",
          },
        },
        res as never,
      ),
    ).rejects.toMatchObject({
      category: "CONFIGURATION_ERROR",
      metadata: {
        hint: "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)",
      },
    });
    expect(assertQuotaAvailable).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
  });
});
