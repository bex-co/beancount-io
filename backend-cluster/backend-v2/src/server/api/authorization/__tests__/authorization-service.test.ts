import type { Identity } from "@/server/api/identity";
import { setAuditSink, type AuditEvent } from "@/server/api/audit";
import { ErrorCategory } from "@/shared/errors";
import { asyncContext, runWithOperationId } from "@/shared/async-context";
import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  AuthorizationDeniedError,
  AuthorizationService,
  type AuthorizationAction,
  type AuthorizationResource,
  type IRelationshipEvaluator,
  userResource,
} from "..";

function identity(
  method: Identity["method"] = "oauth",
  userId = "usr_alice",
  scopes: string[] = [],
): Identity {
  return {
    userId,
    method,
    scopes: new Set(scopes),
    capabilityExempt: method === "session",
  };
}

const selfService = () =>
  new AuthorizationService({
    check: async ({ user, object }) => user === object,
  });

describe("AuthorizationService", () => {
  afterEach(() => setAuditSink(undefined));

  it.each(["session", "oauth"] as const)(
    "allows an authenticated %s user to delete itself",
    async (method) => {
      const service = selfService();

      await expect(
        service.authorize({
          principal: identity(method),
          action: AUTHORIZATION_ACTIONS.USER_DELETE,
          resource: userResource("usr_alice"),
        }),
      ).resolves.toEqual({
        allowed: true,
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: "user:usr_alice",
      });
    },
  );

  it("does not grant account lifecycle authority to API keys", async () => {
    const service = selfService();

    await expect(
      service.authorize({
        principal: identity("apikey"),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "credential_not_permitted",
    });
  });

  it("does not use transport operation metadata as an authorization input", async () => {
    const service = selfService();
    const input = {
      principal: identity("apikey"),
      action: AUTHORIZATION_ACTIONS.USER_DELETE,
      resource: userResource("usr_alice"),
    };

    const direct = await service.authorize(input);
    const requestBound = await asyncContext.run({ requestId: "req_1" }, () =>
      runWithOperationId("GQL Mutation.deleteAccount", () =>
        service.authorize(input),
      ),
    );

    expect(requestBound).toEqual(direct);
    expect(direct).toMatchObject({
      allowed: false,
      reason: "credential_not_permitted",
    });
  });

  it("rejects a malformed identity envelope instead of trusting its exemption bit", async () => {
    const malformed = {
      ...identity("oauth", "usr_alice", []),
      capabilityExempt: true,
    };
    const service = new AuthorizationService({ check: async () => true });
    await expect(
      service.authorize({
        principal: malformed,
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "credential_not_permitted",
    });
  });

  it("denies another user's resource", async () => {
    const service = selfService();

    await expect(
      service.authorize({
        principal: identity(),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_bob"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "relationship_denied",
    });
  });

  it.each([
    [AUTHORIZATION_ACTIONS.USER_PROFILE_READ, "oauth", ["ledger.read"], "user"],
    [AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH, "session", [], "user"],
    [AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE, "session", [], "user"],
    [AUTHORIZATION_ACTIONS.USER_DELETE, "oauth", [], "user"],
    [
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
      "oauth",
      ["ledger.admin"],
      "user",
    ],
    [
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
      "oauth",
      ["ledger.admin"],
      "user",
    ],
    [
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      "apikey",
      ["ledger.admin"],
      "api_key",
    ],
  ] as const)(
    "allows %s with its preserved credential ceiling",
    async (action, method, scopes, resourceType) => {
      const relationships: IRelationshipEvaluator = {
        check: jest.fn(async () => true),
      };
      const service = new AuthorizationService(relationships);
      const resource =
        resourceType === "user"
          ? userResource("usr_alice")
          : apiKeyResource("akey_1");

      await expect(
        service.authorize({
          principal: identity(method, "usr_alice", [...scopes]),
          action,
          resource,
        }),
      ).resolves.toMatchObject({ allowed: true, action, resource });
    },
  );

  it.each([
    [AUTHORIZATION_ACTIONS.USER_PROFILE_READ, "oauth", []],
    [AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH, "oauth", ["ledger.read"]],
    [AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE, "oauth", ["ledger.write"]],
    [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST, "oauth", ["ledger.write"]],
    [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE, "oauth", ["ledger.write"]],
    [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE, "apikey", ["ledger.admin"]],
    [AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE, "oauth", ["ledger.write"]],
  ] as const)(
    "denies %s when its credential ceiling is not met",
    async (action, method, scopes) => {
      const relationships: IRelationshipEvaluator = {
        check: jest.fn(async () => true),
      };
      const service = new AuthorizationService(relationships);
      const resource =
        action === AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE
          ? apiKeyResource("akey_1")
          : userResource("usr_alice");

      const decision = await service.authorize({
        principal: identity(method, "usr_alice", [...scopes]),
        action,
        resource,
      });
      expect(decision).toMatchObject({
        allowed: false,
        reason: "credential_not_permitted",
      });
      expect(relationships.check).not.toHaveBeenCalled();
    },
  );

  it("fails closed for unknown actions", async () => {
    const service = selfService();

    await expect(
      service.authorize({
        principal: identity(),
        action: "user.unknown" as AuthorizationAction,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({ allowed: false, reason: "unknown_action" });
  });

  it("fails closed for malformed or action-incompatible resources", async () => {
    const relationships: IRelationshipEvaluator = {
      check: jest.fn(async () => true),
    };
    const service = new AuthorizationService(relationships);
    const decision = await service.authorize({
      principal: identity("oauth", "usr_alice", ["ledger.admin"]),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: userResource("usr_alice") as AuthorizationResource,
    });
    expect(decision).toMatchObject({
      allowed: false,
      reason: "unknown_resource",
    });
    expect(relationships.check).not.toHaveBeenCalled();
  });

  it("fails closed as service unavailable when relationship evaluation fails", async () => {
    const relationships: IRelationshipEvaluator = {
      check: async () => {
        throw new Error("unavailable");
      },
    };
    const audit = jest.fn();
    const service = new AuthorizationService(relationships, audit);
    const principal = identity();

    await expect(
      service.authorize({
        principal,
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).rejects.toMatchObject({
      category: ErrorCategory.SERVICE_UNAVAILABLE,
    });
    expect(audit).toHaveBeenCalledWith(
      principal,
      { action: AUTHORIZATION_ACTIONS.USER_DELETE, outcome: "error" },
      "admin",
    );
  });

  it("rechecks relationships for every authorization call", async () => {
    const relationships: IRelationshipEvaluator = {
      check: jest.fn(async () => true),
    };
    const service = new AuthorizationService(relationships);
    const principal = identity("session");
    const input = {
      principal,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      resource: userResource(principal.userId),
    };

    await Promise.all([service.authorize(input), service.authorize(input)]);
    expect(relationships.check).toHaveBeenCalledTimes(2);
  });

  it("emits one audit result for every write authorization call", async () => {
    const audit = jest.fn();
    const service = new AuthorizationService(
      { check: async () => true },
      audit,
    );
    const principal = identity("session");
    const input = {
      principal,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource("usr_alice"),
    };
    await service.authorize(input);
    await service.authorize(input);
    expect(audit).toHaveBeenCalledTimes(2);
    expect(audit).toHaveBeenCalledWith(
      principal,
      { action: input.action, outcome: "allowed" },
      "write",
    );
  });

  it("audits an allowed credential listing with its transport op and ledger pin", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const principal = {
      ...identity("oauth", "usr_alice", ["ledger.admin"]),
      ledgerScope: "alice/main",
    };
    const service = new AuthorizationService({ check: async () => true });

    await asyncContext.run({ requestId: "req_1" }, () =>
      runWithOperationId("MCP listApiKeys", () =>
        service.authorizeOrThrow({
          principal,
          action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
          resource: userResource(principal.userId),
        }),
      ),
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(events).toEqual([
      expect.objectContaining({
        op: "MCP listApiKeys",
        ledgerId: "alice/main",
        outcome: "allowed",
      }),
    ]);
  });

  it("uses the canonical action when no transport operation context exists", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const principal = identity("oauth");
    const service = selfService();

    await service.authorizeOrThrow({
      principal,
      action: AUTHORIZATION_ACTIONS.USER_DELETE,
      resource: userResource(principal.userId),
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(events).toEqual([
      expect.objectContaining({
        op: AUTHORIZATION_ACTIONS.USER_DELETE,
        outcome: "allowed",
      }),
    ]);
  });

  it("returns actionable credential denial messages", async () => {
    const service = new AuthorizationService({ check: async () => true });
    await expect(
      service.authorizeOrThrow({
        principal: identity("oauth", "usr_alice", ["ledger.write"]),
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
        resource: userResource("usr_alice"),
      }),
    ).rejects.toThrow('requires the "ledger.admin" scope');
    await expect(
      service.authorizeOrThrow({
        principal: identity("apikey", "usr_alice", ["ledger.admin"]),
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
        resource: userResource("usr_alice"),
      }),
    ).rejects.toThrow("An API key cannot mint another API key");
  });

  it("throws a structured denial for resolver callers", async () => {
    const service = selfService();

    await expect(
      service.authorizeOrThrow({
        principal: identity("apikey"),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it("conceals missing and foreign API-key ownership as not found", async () => {
    const service = new AuthorizationService({ check: async () => false });
    const denied = service.authorizeOrThrow({
      principal: identity("oauth", "usr_alice", ["ledger.admin"]),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: apiKeyResource("akey_unknown"),
    });
    await expect(denied).rejects.toMatchObject({
      category: ErrorCategory.NOT_FOUND,
    });
  });

  it("conceals a blank API-key locator as not found", async () => {
    const service = new AuthorizationService({ check: async () => true });
    const denied = service.authorizeOrThrow({
      principal: identity("oauth", "usr_alice", ["ledger.admin"]),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: apiKeyResource(" "),
    });
    await expect(denied).rejects.toMatchObject({
      category: ErrorCategory.NOT_FOUND,
    });
  });

  it("does not conceal an API-key credential denial as not found", async () => {
    const service = new AuthorizationService({ check: async () => false });
    const denied = service.authorizeOrThrow({
      principal: identity("oauth", "usr_alice", ["ledger.write"]),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: apiKeyResource("akey_1"),
    });
    await expect(denied).rejects.toMatchObject({
      category: ErrorCategory.FORBIDDEN,
      message: 'This operation requires the "ledger.admin" scope',
    });
  });
});
