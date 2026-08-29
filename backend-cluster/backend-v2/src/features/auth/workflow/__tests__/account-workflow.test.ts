import type { IAccountService } from "@/features/auth/service/account-service";
import type { IAuthorizationService } from "@/server/api/authorization";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationDeniedError,
  authorizationRequest,
  userResource,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { AccountWorkflow } from "../account-workflow";

const identity: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

function makeWorkflow() {
  const account = {
    getUserProfile: jest.fn(async () => null),
    findUsersByEmailOrUsername: jest.fn(async () => []),
    updateUsername: jest.fn(async () => undefined),
    updateEmail: jest.fn(async () => undefined),
    updateProfile: jest.fn(async () => true),
    deleteAccount: jest.fn(async () => true),
  } as unknown as jest.Mocked<IAccountService>;
  const authorization = {
    authorize: jest.fn(),
    authorizeOrThrow: jest.fn(async () => ({
      allowed: true as const,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      resource: userResource(identity.userId),
    })),
  } as unknown as jest.Mocked<IAuthorizationService>;
  return {
    account,
    authorization,
    workflow: new AccountWorkflow(account, authorization),
  };
}

describe("AccountWorkflow", () => {
  it("maps every protected account operation to one canonical decision", async () => {
    const { workflow, authorization } = makeWorkflow();
    const request = authorizationRequest(identity);

    await workflow.getUserProfile(request, identity.userId);
    await workflow.findUsersByEmailOrUsername(
      request,
      "alice@example.com",
      false,
    );
    await workflow.updateUsername(request, "alice");
    await workflow.updateProfile(request, "Alice", "A");
    await workflow.deleteAccount(request);

    expect(authorization.authorizeOrThrow.mock.calls).toHaveLength(5);
    expect(
      authorization.authorizeOrThrow.mock.calls.map(([input]) => ({
        action: input.action,
        resource: input.resource,
      })),
    ).toEqual([
      {
        action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
        resource: "user:usr_alice",
      },
      {
        action: AUTHORIZATION_ACTIONS.USER_DELETE,
        resource: "user:usr_alice",
      },
    ]);
  });

  it("passes an explicit profile target to the PDP and performs no read on denial", async () => {
    const { workflow, authorization, account } = makeWorkflow();
    authorization.authorizeOrThrow.mockRejectedValueOnce(
      new AuthorizationDeniedError({
        allowed: false,
        action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
        resource: "user:usr_bob",
        reason: "relationship_denied",
      }),
    );

    await expect(
      workflow.getUserProfile(authorizationRequest(identity), "usr_bob"),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(account.getUserProfile).not.toHaveBeenCalled();
  });

  it.each(["updateUsername", "updateProfile", "deleteAccount"] as const)(
    "keeps domain work behind authorization for %s",
    async (operationName) => {
      const setup = makeWorkflow();
      setup.authorization.authorizeOrThrow.mockRejectedValueOnce(
        new Error("denied"),
      );
      const operation =
        operationName === "updateUsername"
          ? setup.workflow.updateUsername(
              authorizationRequest(identity),
              "next",
            )
          : operationName === "updateProfile"
            ? setup.workflow.updateProfile(
                authorizationRequest(identity),
                "A",
                "B",
              )
            : setup.workflow.deleteAccount(authorizationRequest(identity));
      await expect(operation).rejects.toThrow("denied");
      expect(setup.account.updateUsername).not.toHaveBeenCalled();
      expect(setup.account.updateProfile).not.toHaveBeenCalled();
      expect(setup.account.deleteAccount).not.toHaveBeenCalled();
    },
  );
});
