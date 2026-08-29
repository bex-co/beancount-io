import type { Identity } from "@/server/api/identity";
import { ErrorCategory } from "@/shared/errors";
import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  AuthorizationDeniedError,
  AuthorizationService,
  authorizationRequest,
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

describe("AuthorizationService", () => {
  it.each(["session", "oauth"] as const)(
    "allows an authenticated %s user to delete itself",
    async (method) => {
      const service = new AuthorizationService();

      await expect(
        service.authorize({
          request: authorizationRequest(identity(method)),
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
    const service = new AuthorizationService();

    await expect(
      service.authorize({
        request: authorizationRequest(identity("apikey")),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({
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
        request: authorizationRequest(malformed),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "credential_not_permitted",
    });
  });

  it("denies another user's resource", async () => {
    const service = new AuthorizationService();

    await expect(
      service.authorize({
        request: authorizationRequest(identity()),
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
          request: authorizationRequest(
            identity(method, "usr_alice", [...scopes]),
          ),
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
        request: authorizationRequest(
          identity(method, "usr_alice", [...scopes]),
        ),
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
    const service = new AuthorizationService();

    await expect(
      service.authorize({
        request: authorizationRequest(identity()),
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
      request: authorizationRequest(
        identity("oauth", "usr_alice", ["ledger.admin"]),
      ),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: userResource("usr_alice") as AuthorizationResource,
    });
    expect(decision).toMatchObject({
      allowed: false,
      reason: "unknown_resource",
    });
    expect(relationships.check).not.toHaveBeenCalled();
  });

  it("fails closed when relationship evaluation is unavailable", async () => {
    const relationships: IRelationshipEvaluator = {
      check: async () => {
        throw new Error("unavailable");
      },
    };
    const service = new AuthorizationService(relationships);

    await expect(
      service.authorize({
        request: authorizationRequest(identity()),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "relationship_unavailable",
    });
  });

  it("memoizes only within one AuthorizationRequest", async () => {
    const relationships: IRelationshipEvaluator = {
      check: jest.fn(async () => true),
    };
    const service = new AuthorizationService(relationships);
    const principal = identity("session");
    const request = authorizationRequest(principal);
    const input = {
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      resource: userResource(principal.userId),
    };

    await Promise.all([service.authorize(input), service.authorize(input)]);
    expect(relationships.check).toHaveBeenCalledTimes(1);

    await service.authorize({
      ...input,
      request: authorizationRequest(principal),
    });
    expect(relationships.check).toHaveBeenCalledTimes(2);
  });

  it("emits one central audit hook result for a memoized decision", async () => {
    const audit = jest.fn();
    const service = new AuthorizationService(
      { check: async () => true },
      audit,
    );
    const request = authorizationRequest(identity("session"));
    const input = {
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource("usr_alice"),
    };
    await service.authorize(input);
    await service.authorize(input);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      request.principal,
      expect.objectContaining({ allowed: true, action: input.action }),
      "write",
    );
  });

  it("throws a structured denial for resolver callers", async () => {
    const service = new AuthorizationService();

    await expect(
      service.authorizeOrThrow({
        request: authorizationRequest(identity("apikey")),
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: userResource("usr_alice"),
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it("conceals missing and foreign API-key ownership as not found", async () => {
    const service = new AuthorizationService({ check: async () => false });
    const denied = service.authorizeOrThrow({
      request: authorizationRequest(
        identity("oauth", "usr_alice", ["ledger.admin"]),
      ),
      action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      resource: apiKeyResource("akey_unknown"),
    });
    await expect(denied).rejects.toMatchObject({
      category: ErrorCategory.NOT_FOUND,
    });
  });
});
