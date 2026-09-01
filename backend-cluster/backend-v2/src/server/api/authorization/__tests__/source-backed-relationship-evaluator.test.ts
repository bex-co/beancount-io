import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  ledgerResource,
  LEDGER_RELATIONSHIPS,
  SourceBackedRelationshipEvaluator,
  userResource,
  USER_RELATIONSHIPS,
} from "..";
import { ErrorCategory } from "@/shared/errors";

function makeEvaluator(ownerId: string | null = "usr_alice") {
  const findById = jest.fn(async () =>
    ownerId
      ? {
          id: "akey_1",
          userId: ownerId,
        }
      : null,
  );
  const repoGet = jest.fn(async () => ({
    data: { id: 42, permissions: { admin: true, push: true, pull: true } },
  }));
  const getUserApiClient = jest.fn(async () => ({ repos: { repoGet } }));
  const repoCheckCollaborator = jest.fn(async () => ({ data: {} }));
  const getAdminApiClient = jest.fn(() => ({
    repos: { repoCheckCollaborator },
  }));
  const getById = jest.fn(async () => ({ ledger_username: "alice" }));
  return {
    findById,
    repoGet,
    getUserApiClient,
    getAdminApiClient,
    repoCheckCollaborator,
    getById,
    evaluator: new SourceBackedRelationshipEvaluator(
      {} as never,
      {
        apiKey: { findById } as never,
        user: { getById } as never,
      },
      { getUserApiClient, getAdminApiClient } as never,
    ),
  };
}

describe("SourceBackedRelationshipEvaluator", () => {
  it.each(Object.values(USER_RELATIONSHIPS))(
    "mirrors model.fga exact-self ownership for %s",
    async (relation) => {
      const { evaluator, findById } = makeEvaluator();
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation,
          object: userResource("usr_alice"),
        }),
      ).resolves.toBe(true);
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation,
          object: userResource("usr_bob"),
        }),
      ).resolves.toBe(false);
      expect(findById).not.toHaveBeenCalled();
    },
  );

  it("resolves API-key ownership from the current row", async () => {
    const { evaluator, findById } = makeEvaluator("usr_alice");
    const check = {
      user: userResource("usr_alice"),
      relation: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
      object: apiKeyResource("akey_1"),
    };
    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it.each([null, "usr_bob"])(
    "gives missing and foreign API-key ids the same denial (%s)",
    async (ownerId) => {
      const { evaluator } = makeEvaluator(ownerId);
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation: USER_RELATIONSHIPS.WRITE_CREDENTIALS,
          object: apiKeyResource("akey_1"),
        }),
      ).resolves.toBe(false);
    },
  );

  it("checks current Gitea readability for every ledger authorization", async () => {
    const { evaluator, getUserApiClient, repoGet } = makeEvaluator();
    const check = {
      user: userResource("usr_alice"),
      relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
      object: ledgerResource("alice/main"),
    };

    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(getUserApiClient).toHaveBeenCalledTimes(2);
    expect(getUserApiClient).toHaveBeenCalledWith("usr_alice");
    expect(repoGet).toHaveBeenCalledTimes(2);
    expect(repoGet).toHaveBeenCalledWith("alice", "main", {
      format: "json",
    });
  });

  it.each([
    LEDGER_RELATIONSHIPS.READ_ADMINISTRATION,
    LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
    LEDGER_RELATIONSHIPS.READ_COLLABORATORS,
    LEDGER_RELATIONSHIPS.WRITE_COLLABORATORS,
  ])(
    "requires current Gitea administrator permission for %s",
    async (relation) => {
      const { evaluator, repoGet } = makeEvaluator();
      const check = {
        user: userResource("usr_alice"),
        relation,
        object: ledgerResource("alice/main"),
      };
      await expect(evaluator.check(check)).resolves.toBe(true);
      repoGet.mockResolvedValueOnce({
        data: { id: 42, permissions: { admin: false, push: true, pull: true } },
      });
      await expect(evaluator.check(check)).resolves.toBe(false);
      expect(repoGet).toHaveBeenCalledTimes(2);
    },
  );

  it("rechecks explicit collaborator membership for every leave decision", async () => {
    const {
      evaluator,
      getById,
      getAdminApiClient,
      getUserApiClient,
      repoCheckCollaborator,
    } = makeEvaluator();
    const check = {
      user: userResource("usr_alice"),
      relation: LEDGER_RELATIONSHIPS.LEAVE,
      object: ledgerResource("owner/main"),
    };
    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(getById).toHaveBeenCalledTimes(2);
    expect(getAdminApiClient).toHaveBeenCalledTimes(2);
    expect(getUserApiClient).not.toHaveBeenCalled();
    expect(repoCheckCollaborator).toHaveBeenCalledTimes(2);
    expect(repoCheckCollaborator).toHaveBeenCalledWith(
      "owner",
      "main",
      "alice",
    );
  });

  it.each([403, 404])(
    "treats a Gitea %s collaborator check as a leave denial",
    async (status) => {
      const { evaluator, repoCheckCollaborator } = makeEvaluator();
      repoCheckCollaborator.mockRejectedValueOnce({ status });
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation: LEDGER_RELATIONSHIPS.LEAVE,
          object: ledgerResource("owner/main"),
        }),
      ).resolves.toBe(false);
    },
  );

  it("denies owner self-leave without consulting collaborator membership", async () => {
    const { evaluator, getById, getAdminApiClient, repoCheckCollaborator } =
      makeEvaluator();
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.LEAVE,
        object: ledgerResource("alice/main"),
      }),
    ).resolves.toBe(false);
    expect(getById).toHaveBeenCalledWith(expect.anything(), "usr_alice");
    expect(getAdminApiClient).not.toHaveBeenCalled();
    expect(repoCheckCollaborator).not.toHaveBeenCalled();
  });

  it("propagates a collaborator-source outage", async () => {
    const { evaluator, repoCheckCollaborator } = makeEvaluator();
    repoCheckCollaborator.mockRejectedValueOnce({ status: 503 });
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.LEAVE,
        object: ledgerResource("owner/main"),
      }),
    ).rejects.toEqual({ status: 503 });
  });

  it("denies a malformed ledger locator without calling Gitea", async () => {
    const { evaluator, getUserApiClient } = makeEvaluator();
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.WRITE_ADMINISTRATION,
        object: ledgerResource("malformed"),
      }),
    ).resolves.toBe(false);
    expect(getUserApiClient).not.toHaveBeenCalled();
  });

  it.each([403, 404])(
    "treats Gitea %s as an unreadable-ledger relationship denial",
    async (status) => {
      const { evaluator, repoGet } = makeEvaluator();
      repoGet.mockRejectedValueOnce({ status });
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
          object: ledgerResource("alice/private"),
        }),
      ).resolves.toBe(false);
    },
  );

  it("propagates Gitea outages instead of converting them to denial", async () => {
    const { evaluator, repoGet } = makeEvaluator();
    repoGet.mockRejectedValueOnce({ status: 503 });
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
        object: ledgerResource("alice/main"),
      }),
    ).rejects.toEqual({ status: 503 });
  });

  it("surfaces and audits a Gitea source outage as an authorization error", async () => {
    const { evaluator, repoGet } = makeEvaluator();
    repoGet.mockRejectedValueOnce({ status: 503 });
    const audit = jest.fn();
    const service = new AuthorizationService(evaluator, audit);
    const principal = {
      userId: "usr_alice",
      method: "session" as const,
      scopes: new Set<string>(),
    };

    await expect(
      service.authorizeOrThrow({
        principal,
        action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
        resource: ledgerResource("alice/main"),
      }),
    ).rejects.toMatchObject({ category: ErrorCategory.SERVICE_UNAVAILABLE });
    expect(audit).toHaveBeenCalledWith(
      principal,
      {
        action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
        outcome: "error",
      },
      "write",
      ledgerResource("alice/main"),
    );
  });
});
