import type { IApiKeyService } from "@/features/apikeys/service/api-key-service";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import type { IAuthorizationService } from "@/server/api/authorization";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  authorizationRequest,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { ApiKeyWorkflow } from "../api-key-workflow";

const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  capabilityExempt: false,
};

const key = {
  id: "akey_1",
  userId: identity.userId,
  name: "CI",
  keyDigest: "digest",
  keyPrefix: "bcio_public",
  scopes: ["ledger.read"],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as ApiKey;

function makeWorkflow() {
  const service = {
    mint: jest.fn(async () => ({ key, plaintext: "bcio_secret" })),
    list: jest.fn(async () => [key]),
    revoke: jest.fn(async () => key),
    verify: jest.fn(),
    stampLastUsed: jest.fn(),
  } as unknown as jest.Mocked<IApiKeyService>;
  const authorization = {
    authorize: jest.fn(),
    authorizeOrThrow: jest.fn(async (input) => ({
      allowed: true as const,
      action: input.action,
      resource: input.resource,
    })),
  } as jest.Mocked<IAuthorizationService>;
  return {
    service,
    authorization,
    workflow: new ApiKeyWorkflow(service, authorization),
  };
}

describe("ApiKeyWorkflow", () => {
  it("routes list/create/revoke through their canonical action exactly once", async () => {
    const { workflow, authorization, service } = makeWorkflow();
    await workflow.list(authorizationRequest(identity));
    await workflow.mint(authorizationRequest(identity), {
      name: "CI",
      scopes: ["ledger.read"],
    });
    await workflow.revoke(authorizationRequest(identity), key.id);

    expect(
      authorization.authorizeOrThrow.mock.calls.map(([input]) => ({
        action: input.action,
        resource: input.resource,
      })),
    ).toEqual([
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
        resource: "api_key:akey_1",
      },
    ]);
    expect(service.list).toHaveBeenCalledWith("usr_alice");
    expect(service.revoke).toHaveBeenCalledWith("akey_1");
  });

  it.each(["list", "mint", "revoke"] as const)(
    "performs no API-key domain work when %s authorization denies",
    async (operation) => {
      const { workflow, authorization, service } = makeWorkflow();
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      const result =
        operation === "list"
          ? workflow.list(authorizationRequest(identity))
          : operation === "mint"
            ? workflow.mint(authorizationRequest(identity), {
                name: "CI",
                scopes: ["ledger.read"],
              })
            : workflow.revoke(authorizationRequest(identity), key.id);
      await expect(result).rejects.toThrow("denied");
      expect(service.list).not.toHaveBeenCalled();
      expect(service.mint).not.toHaveBeenCalled();
      expect(service.revoke).not.toHaveBeenCalled();
    },
  );

  it("performs no domain read when the relationship source is unavailable", async () => {
    const { service } = makeWorkflow();
    const unavailable = new ApiKeyWorkflow(
      service,
      new AuthorizationService({
        check: async () => {
          throw new Error("database unavailable");
        },
      }),
    );
    await expect(
      unavailable.list(authorizationRequest(identity)),
    ).rejects.toThrow("Authorization denied");
    expect(service.list).not.toHaveBeenCalled();
  });
});
