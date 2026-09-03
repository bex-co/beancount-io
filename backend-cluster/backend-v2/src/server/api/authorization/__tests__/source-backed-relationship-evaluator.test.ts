import {
  apiKeyResource,
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  bankConnectionResource,
  ledgerResource,
  LEDGER_RELATIONSHIPS,
  SourceBackedRelationshipEvaluator,
  tempAssetResource,
  TEMP_ASSET_RELATIONSHIPS,
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
  const getPlaidItemById = jest.fn(async () => ({
    id: "pitm_1",
    userId: "usr_alice",
    ledgerRepoId: 42,
  }));
  const getUserApiClient = jest.fn(async () => ({ repos: { repoGet } }));
  const repoCheckCollaborator = jest.fn(async () => ({ data: {} }));
  const getAdminApiClient = jest.fn(() => ({
    repos: { repoCheckCollaborator, repoGet },
  }));
  const getById = jest.fn(async () => ({ ledger_username: "alice" }));
  const getUserByUsername = jest.fn(async () => ({ id: "usr_alice" }));
  const getLedger = jest.fn(async () => ({
    data: { success: true, data: { id: 42, private: true } },
  }));
  const getAdminClient = jest.fn(() => ({ ledgers: { getLedger } }));
  const getLedgerCollaboratorPermission = jest.fn(async () => ({
    data: { success: true, data: { permission: "none" } },
  }));
  const getApiContext = jest.fn(async () => ({
    favaApiClient: {
      collaborators: { getLedgerCollaboratorPermission },
    },
  }));
  return {
    findById,
    repoGet,
    getUserApiClient,
    getAdminApiClient,
    repoCheckCollaborator,
    getById,
    getLedger,
    getPlaidItemById,
    evaluator: new SourceBackedRelationshipEvaluator(
      {} as never,
      {
        apiKey: { findById } as never,
        user: { getById, getUserByUsername } as never,
        plaidItem: { getById: getPlaidItemById } as never,
      },
      { getUserApiClient, getAdminApiClient } as never,
      { getAdminClient, getApiContext } as never,
    ),
  };
}

describe("SourceBackedRelationshipEvaluator", () => {
  it("lets a signed-in public visitor ask while denying the write upgrade", async () => {
    const { evaluator, getLedger } = makeEvaluator();
    getLedger.mockResolvedValue({
      data: { success: true, data: { id: 42, private: false } },
    });
    const service = new AuthorizationService(evaluator, jest.fn());
    const principal = {
      userId: "usr_public_visitor",
      method: "session" as const,
      scopes: new Set<string>(),
    };

    await expect(
      service.authorize({
        principal,
        action: AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
        resource: ledgerResource("alice/main"),
      }),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      service.authorize({
        principal,
        action: AUTHORIZATION_ACTIONS.AI_LEDGER_AGENT,
        resource: ledgerResource("alice/main"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "relationship_denied",
    });
  });

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

  it("checks current ledger readability for every authorization", async () => {
    const { evaluator, getLedger, getUserApiClient } = makeEvaluator();
    const check = {
      user: userResource("usr_alice"),
      relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
      object: ledgerResource("alice/main"),
    };

    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(getLedger).toHaveBeenCalledTimes(2);
    expect(getLedger).toHaveBeenCalledWith("alice", "main");
    expect(getUserApiClient).not.toHaveBeenCalled();
  });

  it("evaluates a composite ledger action from one fresh repository snapshot", async () => {
    const { evaluator, getLedger, getUserApiClient, repoGet } = makeEvaluator();
    await expect(
      evaluator.checkAll([
        {
          user: userResource("usr_alice"),
          relation: LEDGER_RELATIONSHIPS.WRITE_CONTENTS,
          object: ledgerResource("alice/main"),
        },
        {
          user: userResource("usr_alice"),
          relation: LEDGER_RELATIONSHIPS.WRITE_ASSETS,
          object: ledgerResource("alice/main"),
        },
      ]),
    ).resolves.toBe(true);
    expect(getLedger).toHaveBeenCalledTimes(1);
    expect(getUserApiClient).not.toHaveBeenCalled();
    expect(repoGet).not.toHaveBeenCalled();
  });

  it("allows anonymous reads only for a currently public ledger", async () => {
    const { evaluator, repoGet, getAdminApiClient } = makeEvaluator();
    repoGet.mockResolvedValueOnce({
      data: {
        id: 42,
        private: false,
        permissions: { admin: true, push: true, pull: true },
      },
    } as never);
    await expect(
      evaluator.check({
        user: userResource("anonymous"),
        relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
        object: ledgerResource("alice/public"),
      }),
    ).resolves.toBe(true);
    expect(getAdminApiClient).toHaveBeenCalledTimes(1);

    repoGet.mockResolvedValueOnce({
      data: {
        id: 42,
        private: true,
        permissions: { admin: true, push: true, pull: true },
      },
    } as never);
    await expect(
      evaluator.check({
        user: userResource("anonymous"),
        relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
        object: ledgerResource("alice/private"),
      }),
    ).resolves.toBe(false);
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

  it("propagates ledger-source outages instead of converting them to denial", async () => {
    const { evaluator, getLedger } = makeEvaluator();
    getLedger.mockRejectedValueOnce(new Error("ledger source offline"));
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
        object: ledgerResource("alice/main"),
      }),
    ).rejects.toThrow("ledger source offline");
  });

  it("resolves every bank item/user/ledger binding from current source rows", async () => {
    const { evaluator, repoGet, getPlaidItemById } = makeEvaluator();
    const check = {
      user: userResource("usr_alice"),
      relation: LEDGER_RELATIONSHIPS.WRITE_BANK_CONNECTIONS,
      object: bankConnectionResource("alice/main", "pitm_1"),
    };
    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(true);
    expect(repoGet).toHaveBeenCalledTimes(2);
    expect(getPlaidItemById).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["usr_bob", 42],
    ["usr_alice", 99],
  ])(
    "denies a bank binding with source user=%s repo=%s",
    async (userId, ledgerRepoId) => {
      const { evaluator, getPlaidItemById } = makeEvaluator();
      getPlaidItemById.mockResolvedValueOnce({
        id: "pitm_1",
        userId,
        ledgerRepoId,
      });
      await expect(
        evaluator.check({
          user: userResource("usr_alice"),
          relation: LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
          object: bankConnectionResource("alice/main", "pitm_1"),
        }),
      ).resolves.toBe(false);
    },
  );

  it("keeps bank authority at the ledger-admin relationship", async () => {
    const { evaluator, repoGet } = makeEvaluator();
    repoGet.mockResolvedValueOnce({
      data: { id: 42, permissions: { pull: true, push: true, admin: false } },
    });
    await expect(
      evaluator.check({
        user: userResource("usr_alice"),
        relation: LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS,
        object: bankConnectionResource("alice/main"),
      }),
    ).resolves.toBe(false);
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
        action: AUTHORIZATION_ACTIONS.BANK_CONNECTIONS_LIST,
        resource: bankConnectionResource("alice/main"),
      }),
    ).rejects.toMatchObject({ category: ErrorCategory.SERVICE_UNAVAILABLE });
    expect(audit).toHaveBeenCalledWith(
      principal,
      {
        action: AUTHORIZATION_ACTIONS.BANK_CONNECTIONS_LIST,
        outcome: "error",
        ledgerId: "alice/main",
      },
      "admin",
    );
  });

  it("surfaces and audits a ledger source outage as an authorization error", async () => {
    const { evaluator, getLedger } = makeEvaluator();
    getLedger.mockRejectedValueOnce(new Error("ledger source offline"));
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
        ledgerId: "alice/main",
      },
      "write",
    );
  });

  it.each([
    ["tmp/usr_alice/r.pdf", "usr_alice", true],
    ["tmp/usr_bob/r.pdf", "usr_alice", false],
    ["assets/repo_1/r.pdf", "usr_alice", false],
    ["tmp/usr_alice/", "usr_alice", false],
  ] as const)(
    "resolves temp asset ownership from the key invariant (%s)",
    async (key, userId, expected) => {
      const { evaluator } = makeEvaluator();
      await expect(
        evaluator.check({
          user: userResource(userId),
          relation: TEMP_ASSET_RELATIONSHIPS.OWNER,
          object: tempAssetResource(key),
        }),
      ).resolves.toBe(expected);
    },
  );

  it.each([
    ["usr_owner", "admin", LEDGER_RELATIONSHIPS.WRITE_AI, true],
    ["usr_writer", "write", LEDGER_RELATIONSHIPS.WRITE_CONTENTS, true],
    ["usr_reader", "read", LEDGER_RELATIONSHIPS.READ_ASSETS, true],
    ["usr_reader", "read", LEDGER_RELATIONSHIPS.WRITE_AI, false],
    ["usr_writer", "write", LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS, false],
    ["usr_admin", "admin", LEDGER_RELATIONSHIPS.READ_BANK_CONNECTIONS, true],
  ] as const)(
    "maps current ledger rank for %s/%s/%s",
    async (userId, permission, relation, expected) => {
      const getLedgerCollaboratorPermission = jest.fn().mockResolvedValue({
        data: { success: true, data: { permission } },
      });
      const evaluator = new SourceBackedRelationshipEvaluator(
        {} as never,
        {
          apiKey: {} as never,
          plaidItem: {} as never,
          user: {
            getUserByUsername: jest.fn().mockResolvedValue({ id: "usr_owner" }),
            getById: jest.fn().mockResolvedValue({ ledger_username: userId }),
          } as never,
        },
        {} as never,
        {
          getAdminClient: jest.fn().mockReturnValue({
            ledgers: {
              getLedger: jest.fn().mockResolvedValue({
                data: { success: true, data: { id: 1, private: true } },
              }),
            },
          }),
          getApiContext: jest.fn().mockResolvedValue({
            favaApiClient: {
              collaborators: { getLedgerCollaboratorPermission },
            },
          }),
        } as never,
      );

      await expect(
        evaluator.check({
          user: userResource(userId),
          relation,
          object: ledgerResource("alice/main"),
        }),
      ).resolves.toBe(expected);
    },
  );

  it("observes collaborator revocation on the next check", async () => {
    const getLedgerCollaboratorPermission = jest
      .fn()
      .mockResolvedValueOnce({
        data: { success: true, data: { permission: "write" } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { permission: null } },
      });
    const evaluator = new SourceBackedRelationshipEvaluator(
      {} as never,
      {
        apiKey: {} as never,
        plaidItem: {} as never,
        user: {
          getUserByUsername: jest.fn().mockResolvedValue({ id: "usr_owner" }),
          getById: jest
            .fn()
            .mockResolvedValue({ ledger_username: "collaborator" }),
        } as never,
      },
      {} as never,
      {
        getAdminClient: jest.fn().mockReturnValue({
          ledgers: {
            getLedger: jest.fn().mockResolvedValue({
              data: { success: true, data: { id: 1, private: true } },
            }),
          },
        }),
        getApiContext: jest.fn().mockResolvedValue({
          favaApiClient: {
            collaborators: { getLedgerCollaboratorPermission },
          },
        }),
      } as never,
    );
    const check = {
      user: userResource("usr_writer"),
      relation: LEDGER_RELATIONSHIPS.WRITE_CONTENTS,
      object: ledgerResource("alice/main"),
    } as const;

    await expect(evaluator.check(check)).resolves.toBe(true);
    await expect(evaluator.check(check)).resolves.toBe(false);
    expect(getLedgerCollaboratorPermission).toHaveBeenCalledTimes(2);
  });

  it("propagates ledger relationship source outages", async () => {
    const evaluator = new SourceBackedRelationshipEvaluator(
      {} as never,
      {
        apiKey: {} as never,
        plaidItem: {} as never,
        user: {
          getUserByUsername: jest.fn().mockResolvedValue({ id: "usr_owner" }),
          getById: jest
            .fn()
            .mockResolvedValue({ ledger_username: "collaborator" }),
        } as never,
      },
      {} as never,
      {
        getAdminClient: jest.fn().mockReturnValue({
          ledgers: {
            getLedger: jest.fn().mockResolvedValue({
              data: { success: true, data: { id: 1, private: true } },
            }),
          },
        }),
        getApiContext: jest.fn().mockResolvedValue({
          favaApiClient: {
            collaborators: {
              getLedgerCollaboratorPermission: jest
                .fn()
                .mockRejectedValue(new Error("ledger source offline")),
            },
          },
        }),
      } as never,
    );

    await expect(
      evaluator.check({
        user: userResource("usr_writer"),
        relation: LEDGER_RELATIONSHIPS.READ_CONTENTS,
        object: ledgerResource("alice/main"),
      }),
    ).rejects.toThrow("ledger source offline");
  });
});
