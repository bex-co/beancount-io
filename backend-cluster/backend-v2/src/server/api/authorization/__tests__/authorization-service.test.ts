import type { Identity } from "@/server/api/identity";
import { setAuditSink, type AuditEvent } from "@/server/api/audit";
import { ErrorCategory } from "@/shared/errors";
import { asyncContext, runWithOperationId } from "@/shared/async-context";
import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  authorizationActionAcceptsDelegatedCredential,
  AuthorizationDeniedError,
  AuthorizationService,
  type AuthorizationAction,
  type AuthorizationResource,
  type IRelationshipEvaluator,
  ledgerResource,
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

const BILLING_ACTIONS = [
  AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
  AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
  AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE,
  AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
  AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME,
  AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE,
] as const;

const SESSION_SOCIAL_ACTIONS = [
  AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ,
  AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_CREATE,
  AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_DELETE,
] as const;

const LEDGER_SOCIAL_ACTIONS = [
  AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_STATUS_READ,
  AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
  AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE,
] as const;

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

  it.each(SESSION_SOCIAL_ACTIONS)(
    "does not classify session-only social action %s as delegated parity work",
    (action) => {
      expect(authorizationActionAcceptsDelegatedCredential(action)).toBe(false);
    },
  );

  it.each(SESSION_SOCIAL_ACTIONS)(
    "allows a session to perform %s on its own social resource",
    async (action) => {
      const principal = identity("session");
      await expect(
        selfService().authorize({
          principal,
          action,
          resource: userResource(principal.userId),
        }),
      ).resolves.toMatchObject({ allowed: true, action });
    },
  );

  it.each(SESSION_SOCIAL_ACTIONS)(
    "denies delegated credentials for session-only social action %s before source work",
    async (action) => {
      const relationships = { check: jest.fn(async () => true) };
      const service = new AuthorizationService(relationships);
      for (const principal of [
        identity("oauth", "usr_alice", ["ledger.admin"]),
        identity("apikey", "usr_alice", ["ledger.admin"]),
      ]) {
        await expect(
          service.authorize({
            principal,
            action,
            resource: userResource(principal.userId),
          }),
        ).resolves.toMatchObject({
          allowed: false,
          reason: "credential_not_permitted",
        });
      }
      expect(relationships.check).not.toHaveBeenCalled();
    },
  );

  it.each([
    [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_STATUS_READ, "ledger.read"],
    [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE, "ledger.write"],
    [AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE, "ledger.write"],
  ] as const)(
    "allows %s only with its preserved capability and current ledger relationship",
    async (action, scope) => {
      const relationships = { check: jest.fn(async () => true) };
      const service = new AuthorizationService(relationships);
      const principal = identity("apikey", "usr_alice", [scope]);
      const resource = ledgerResource("alice/main");
      await expect(
        service.authorize({ principal, action, resource }),
      ).resolves.toMatchObject({ allowed: true, action, resource });
      expect(relationships.check).toHaveBeenCalledWith({
        user: userResource("usr_alice"),
        relation: "can_read_contents",
        object: resource,
      });
    },
  );

  it.each(LEDGER_SOCIAL_ACTIONS)(
    "denies %s when the current Gitea relationship is unreadable",
    async (action) => {
      const service = new AuthorizationService({ check: async () => false });
      const principal = identity("session");
      await expect(
        service.authorize({
          principal,
          action,
          resource: ledgerResource("alice/private"),
        }),
      ).resolves.toMatchObject({
        allowed: false,
        reason: "relationship_denied",
      });
    },
  );

  it("enforces a delegated credential's ledger pin before Gitea lookup", async () => {
    const relationships = { check: jest.fn(async () => true) };
    const service = new AuthorizationService(relationships);
    const principal = {
      ...identity("oauth", "usr_alice", ["ledger.write"]),
      ledgerScope: "alice/allowed",
    };
    await expect(
      service.authorize({
        principal,
        action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
        resource: ledgerResource("alice/other"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "credential_not_permitted",
    });
    expect(relationships.check).not.toHaveBeenCalled();
  });

  it.each(BILLING_ACTIONS)(
    "allows a browser session to perform %s for its own billing resource",
    async (action) => {
      const service = selfService();
      await expect(
        service.authorize({
          principal: identity("session"),
          action,
          resource: userResource("usr_alice"),
        }),
      ).resolves.toMatchObject({ allowed: true, action });
    },
  );

  it.each(
    BILLING_ACTIONS.flatMap((action) =>
      (["oauth", "apikey"] as const).map((method) => [action, method] as const),
    ),
  )(
    "denies %s to a %s credential before relationship evaluation",
    async (action, method) => {
      const relationships: IRelationshipEvaluator = {
        check: jest.fn(async () => true),
      };
      const service = new AuthorizationService(relationships);
      await expect(
        service.authorizeOrThrow({
          principal: identity(method, "usr_alice", [
            "ledger.read",
            "ledger.write",
            "ledger.admin",
          ]),
          action,
          resource: userResource("usr_alice"),
        }),
      ).rejects.toMatchObject({
        category: ErrorCategory.FORBIDDEN,
        message: "Managing billing requires a full signed-in session",
      });
      expect(relationships.check).not.toHaveBeenCalled();
    },
  );

  it.each(BILLING_ACTIONS)(
    "denies cross-user billing relationship for %s",
    async (action) => {
      const service = selfService();
      await expect(
        service.authorize({
          principal: identity("session", "usr_alice"),
          action,
          resource: userResource("usr_bob"),
        }),
      ).resolves.toMatchObject({
        allowed: false,
        reason: "relationship_denied",
      });
    },
  );

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

  it("keeps concurrent social operation IDs isolated and audits duplicate roots independently", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const principal = identity("session");
    const service = new AuthorizationService({ check: async () => true });
    const authorize = (op: string, action: AuthorizationAction) =>
      runWithOperationId(op, () =>
        service.authorizeOrThrow({
          principal,
          action,
          resource: ledgerResource("alice/main"),
        }),
      );

    await asyncContext.run({ requestId: "req_social" }, () =>
      Promise.all([
        authorize(
          "GQL Mutation.starLedger",
          AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
        ),
        authorize(
          "GQL Mutation.unstarLedger",
          AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE,
        ),
        authorize(
          "GQL Mutation.starLedger",
          AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
        ),
      ]),
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(events.map((event) => event.op).sort()).toEqual(
      [
        "GQL Mutation.starLedger",
        "GQL Mutation.starLedger",
        "GQL Mutation.unstarLedger",
      ].sort(),
    );
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.ledgerId === "alice/main")).toBe(true);
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
