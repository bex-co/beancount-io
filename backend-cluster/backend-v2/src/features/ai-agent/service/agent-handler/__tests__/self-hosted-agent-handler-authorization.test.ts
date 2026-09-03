import {
  AUTHORIZATION_ACTIONS,
  AuthorizationUnavailableError,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { SelfHostedAgentHandler } from "../self-hosted-agent-handler";

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
          apiKeyService: {} as never,
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
});
