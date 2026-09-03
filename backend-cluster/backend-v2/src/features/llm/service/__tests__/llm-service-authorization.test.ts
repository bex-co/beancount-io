import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationUnavailableError,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { LLMService } from "../llm-service";

const principal: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

function makeService(authorization: IAuthorizationService) {
  const getObjectMetadata = jest.fn();
  const generateDownloadUrl = jest.fn();
  const assertQuotaAvailable = jest.fn().mockResolvedValue(undefined);
  const addTokenUsage = jest.fn().mockResolvedValue(undefined);
  const check = jest.fn().mockResolvedValue({ allowed: true });
  const service = new LLMService(
    { getApiContext: jest.fn() } as never,
    { getObjectMetadata, generateDownloadUrl } as never,
    { check, assertQuotaAvailable, addTokenUsage } as never,
    { blockeden: { accessKey: "test-key" } } as never,
    authorization,
  );
  return {
    service,
    getObjectMetadata,
    generateDownloadUrl,
    assertQuotaAvailable,
    addTokenUsage,
    check,
  };
}

describe("LLMService centralized authorization", () => {
  afterEach(() => jest.restoreAllMocks());

  it("surfaces source unavailability before quota, S3, or parser work", async () => {
    const unavailable = new AuthorizationUnavailableError(
      AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_PARSE,
    );
    const authorization: IAuthorizationService = {
      authorize: jest.fn(),
      authorizeOrThrow: jest.fn().mockRejectedValue(unavailable),
    };
    const deps = makeService(authorization);

    await expect(
      deps.service.parseReceipt(
        principal,
        "tmp/usr_1/receipt.pdf",
        "alice/main",
      ),
    ).rejects.toBe(unavailable);
    expect(deps.check).not.toHaveBeenCalled();
    expect(deps.getObjectMetadata).not.toHaveBeenCalled();
    expect(deps.generateDownloadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["invokeOpenAI", "total_tokens", { usage: { total_tokens: 9 } }, 9],
    [
      "invokeAnthropic",
      "input_tokens",
      { usage: { input_tokens: 4, output_tokens: 6 } },
      10,
    ],
  ] as const)(
    "authorizes %s before quota and upstream invocation",
    async (method, _usageField, body, expectedTokens) => {
      const authorization: IAuthorizationService = {
        authorize: jest.fn(),
        authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
      };
      const deps = makeService(authorization);
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await deps.service[method](principal, { messages: [] });

      expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal,
        action: AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE,
        resource: "user:usr_1",
      });
      expect(
        (authorization.authorizeOrThrow as jest.Mock).mock
          .invocationCallOrder[0],
      ).toBeLessThan(deps.assertQuotaAvailable.mock.invocationCallOrder[0]);
      expect(
        deps.assertQuotaAvailable.mock.invocationCallOrder[0],
      ).toBeLessThan(fetchSpy.mock.invocationCallOrder[0]);
      expect(deps.addTokenUsage).toHaveBeenCalledWith("usr_1", expectedTokens);
    },
  );

  it("makes a fresh authorization decision for identical AI calls", async () => {
    const authorization: IAuthorizationService = {
      authorize: jest.fn(),
      authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
    };
    const deps = makeService(authorization);
    jest.spyOn(global, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ usage: { total_tokens: 0 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await deps.service.invokeOpenAI(principal, { messages: [] });
    await deps.service.invokeOpenAI(principal, { messages: [] });
    expect(authorization.authorizeOrThrow).toHaveBeenCalledTimes(2);
  });
});
