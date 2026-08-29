import type { Identity } from "@/server/api/identity";
import {
  AuthorizationDeniedError,
  AuthorizationService,
  USER_DELETE_ACTION,
  type IRelationshipEvaluator,
} from "../authorization-service";

function identity(
  method: Identity["method"] = "oauth",
  userId = "usr_alice",
): Identity {
  return {
    userId,
    method,
    scopes: new Set(),
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
          principal: identity(method),
          action: USER_DELETE_ACTION,
          resource: "user:usr_alice",
        }),
      ).resolves.toEqual({
        allowed: true,
        action: USER_DELETE_ACTION,
        resource: "user:usr_alice",
      });
    },
  );

  it("does not grant account lifecycle authority to API keys", async () => {
    const service = new AuthorizationService();

    await expect(
      service.authorize({
        principal: identity("apikey"),
        action: USER_DELETE_ACTION,
        resource: "user:usr_alice",
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
        principal: identity(),
        action: USER_DELETE_ACTION,
        resource: "user:usr_bob",
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "relationship_denied",
    });
  });

  it("fails closed for unknown actions", async () => {
    const service = new AuthorizationService();

    await expect(
      service.authorize({
        principal: identity(),
        action: "user.unknown",
        resource: "user:usr_alice",
      }),
    ).resolves.toMatchObject({ allowed: false, reason: "unknown_action" });
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
        principal: identity(),
        action: USER_DELETE_ACTION,
        resource: "user:usr_alice",
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "relationship_unavailable",
    });
  });

  it("throws a structured denial for resolver callers", async () => {
    const service = new AuthorizationService();

    await expect(
      service.authorizeOrThrow({
        principal: identity("apikey"),
        action: USER_DELETE_ACTION,
        resource: "user:usr_alice",
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });
});
