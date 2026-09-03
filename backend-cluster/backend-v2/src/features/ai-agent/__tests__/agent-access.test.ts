import {
  AUTHORIZATION_ACTIONS,
  AuthorizationUnavailableError,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { resolveAgentAccessMode } from "../agent-access";

const identity = {
  userId: "usr_1",
  method: "oauth" as const,
  scopes: new Set(["ledger.read"]),
  ledgerScope: "alice/main",
};

function allowed(action: typeof AUTHORIZATION_ACTIONS.AI_LEDGER_ASK) {
  return {
    allowed: true as const,
    action,
    resource: "ledger:alice/main" as const,
  };
}

describe("resolveAgentAccessMode", () => {
  it("returns read mode for an ask request without probing write access", async () => {
    const authorization: IAuthorizationService = {
      authorizeOrThrow: jest
        .fn()
        .mockResolvedValue(allowed(AUTHORIZATION_ACTIONS.AI_LEDGER_ASK)),
      authorize: jest.fn(),
    };

    await expect(
      resolveAgentAccessMode({
        authorization,
        identity,
        ledgerId: "alice/main",
        requestedMode: "ask",
      }),
    ).resolves.toBe("read");
    expect(authorization.authorize).not.toHaveBeenCalled();
  });

  it("upgrades a writer's agent request to write mode", async () => {
    const authorization: IAuthorizationService = {
      authorizeOrThrow: jest
        .fn()
        .mockResolvedValue(allowed(AUTHORIZATION_ACTIONS.AI_LEDGER_ASK)),
      authorize: jest.fn().mockResolvedValue({
        allowed: true,
        action: AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT,
        resource: "ledger:alice/main",
      }),
    };

    await expect(
      resolveAgentAccessMode({
        authorization,
        identity,
        ledgerId: "alice/main",
        requestedMode: "agent",
      }),
    ).resolves.toBe("write");
  });

  it("downgrades an agent request when write permission is denied", async () => {
    const authorization: IAuthorizationService = {
      authorizeOrThrow: jest
        .fn()
        .mockResolvedValue(allowed(AUTHORIZATION_ACTIONS.AI_LEDGER_ASK)),
      authorize: jest.fn().mockResolvedValue({
        allowed: false,
        action: AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT,
        resource: "ledger:alice/main",
        reason: "relationship_denied",
        message: "Authorization denied",
      }),
    };

    await expect(
      resolveAgentAccessMode({
        authorization,
        identity,
        ledgerId: "alice/main",
        requestedMode: "agent",
      }),
    ).resolves.toBe("read");
  });

  it("fails closed when the write relationship source is unavailable", async () => {
    const unavailable = new AuthorizationUnavailableError(
      AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT,
    );
    const authorization: IAuthorizationService = {
      authorizeOrThrow: jest
        .fn()
        .mockResolvedValue(allowed(AUTHORIZATION_ACTIONS.AI_LEDGER_ASK)),
      authorize: jest.fn().mockRejectedValue(unavailable),
    };

    await expect(
      resolveAgentAccessMode({
        authorization,
        identity,
        ledgerId: "alice/main",
        requestedMode: "agent",
      }),
    ).rejects.toBe(unavailable);
  });

  it("fails closed when the read relationship source is unavailable", async () => {
    const unavailable = new AuthorizationUnavailableError(
      AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
    );
    const authorization: IAuthorizationService = {
      authorizeOrThrow: jest.fn().mockRejectedValue(unavailable),
      authorize: jest.fn(),
    };

    await expect(
      resolveAgentAccessMode({
        authorization,
        identity,
        ledgerId: "alice/main",
        requestedMode: "agent",
      }),
    ).rejects.toBe(unavailable);
    expect(authorization.authorize).not.toHaveBeenCalled();
  });
});
