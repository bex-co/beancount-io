import { authorizeLedger, type AuthorizeLedgerDeps } from "../authorize-ledger";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";

const mockGetUserByUsername = jest.fn();
const mockGetById = jest.fn();
const mockGetLedgerCollaboratorPermission = jest.fn();
const mockGetLedger = jest.fn();
const mockGetApiContext = jest.fn().mockResolvedValue({
  favaApiClient: {
    collaborators: {
      getLedgerCollaboratorPermission: mockGetLedgerCollaboratorPermission,
    },
  },
});
const mockGetAdminClient = jest
  .fn()
  .mockReturnValue({ ledgers: { getLedger: mockGetLedger } });

const deps: AuthorizeLedgerDeps = {
  db: {} as never,
  models: {
    user: {
      getUserByUsername: mockGetUserByUsername,
      getById: mockGetById,
    } as never,
  },
  favaClientFactory: {
    getAdminClient: mockGetAdminClient,
    getApiContext: mockGetApiContext,
  } as never,
};

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    userId: "user-1",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
    capabilityExempt: false,
    ...overrides,
  };
}

describe("authorizeLedger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { id: 42, private: true } },
    });
  });

  describe("OAuth capabilities", () => {
    it.each([
      ["read", "ledger.read"],
      ["write", "ledger.write"],
      ["admin", "ledger.admin"],
    ] as const)("requires %s operations to carry %s", async (rel, scope) => {
      await expect(
        authorizeLedger(
          identity({ scopes: new Set() }),
          "owner/main",
          rel,
          deps,
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockGetUserByUsername).not.toHaveBeenCalled();
      expect(mockGetAdminClient).not.toHaveBeenCalled();

      mockGetUserByUsername.mockResolvedValue({ id: "user-1" });
      await expect(
        authorizeLedger(
          identity({ scopes: new Set([scope]) }),
          "owner/main",
          rel,
          deps,
        ),
      ).resolves.toEqual({ ledgerRepoId: 42, ownerUserId: "user-1" });
    });

    it.each([
      ["ledger.write", "read"],
      ["ledger.admin", "read"],
      ["ledger.admin", "write"],
    ] as const)("lets %s satisfy a weaker %s operation", async (scope, rel) => {
      mockGetUserByUsername.mockResolvedValue({ id: "user-1" });
      await expect(
        authorizeLedger(
          identity({ scopes: new Set([scope]) }),
          "owner/main",
          rel,
          deps,
        ),
      ).resolves.toEqual({ ledgerRepoId: 42, ownerUserId: "user-1" });
    });

    it("leaves a full-power legacy session exempt from the scope matrix", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "user-1" });
      await expect(
        authorizeLedger(
          identity({
            method: "session",
            scopes: new Set(),
            capabilityExempt: true,
          }),
          "owner/main",
          "admin",
          deps,
        ),
      ).resolves.toEqual({ ledgerRepoId: 42, ownerUserId: "user-1" });
    });
  });

  it("authorizes the owner for admin and returns ledger metadata", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
    const result = await authorizeLedger(
      identity({ userId: "owner-1" }),
      "owner/main",
      "admin",
      deps,
    );
    expect(result).toEqual({ ledgerRepoId: 42, ownerUserId: "owner-1" });
  });

  it("denies a read-only collaborator a write verb", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
    mockGetById.mockResolvedValue({
      id: "user-1",
      ledger_username: "bob",
    });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: true, data: { permission: "read" } },
    });
    await expect(
      authorizeLedger(identity(), "owner/main", "write", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows a write collaborator a write verb", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
    mockGetById.mockResolvedValue({
      id: "user-1",
      ledger_username: "bob",
    });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: true, data: { permission: "write" } },
    });
    const result = await authorizeLedger(
      identity(),
      "owner/main",
      "write",
      deps,
    );
    expect(result.ledgerRepoId).toBe(42);
  });

  describe("ledgerScope", () => {
    it("rejects a mismatched ledgerScope before touching the database", async () => {
      await expect(
        authorizeLedger(
          identity({ ledgerScope: "someone/else" }),
          "owner/main",
          "read",
          deps,
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockGetUserByUsername).not.toHaveBeenCalled();
      expect(mockGetAdminClient).not.toHaveBeenCalled();
    });

    it("allows a matching ledgerScope through to the normal check", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "user-1" });
      const result = await authorizeLedger(
        identity({ ledgerScope: "owner/main" }),
        "owner/main",
        "admin",
        deps,
      );
      expect(result.ledgerRepoId).toBe(42);
    });
  });

  describe("anonymous callers (no identity)", () => {
    it("allows read on a public ledger", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { id: 7, private: false } },
      });
      mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
      const result = await authorizeLedger(
        undefined,
        "owner/main",
        "read",
        deps,
      );
      expect(result).toEqual({ ledgerRepoId: 7, ownerUserId: "owner-1" });
      // No user lookup by id — nothing to look up for an anonymous caller.
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it("denies read on a private ledger", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
      await expect(
        authorizeLedger(undefined, "owner/main", "read", deps),
      ).rejects.toThrow(ForbiddenError);
    });

    it("refuses write/admin outright, before any lookup", async () => {
      await expect(
        authorizeLedger(undefined, "owner/main", "write", deps),
      ).rejects.toThrow(UnauthenticatedError);
      expect(mockGetUserByUsername).not.toHaveBeenCalled();
    });
  });

  describe("per-identity memo", () => {
    it("hits the memo on a second call for the same ledger", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
      const id = identity({ userId: "owner-1" });
      await authorizeLedger(id, "owner/main", "read", deps);
      await authorizeLedger(id, "owner/main", "admin", deps);
      // One lookup, not two — the second call re-uses the first's in-flight
      // (and by then resolved) promise rather than re-querying.
      expect(mockGetUserByUsername).toHaveBeenCalledTimes(1);
      expect(mockGetAdminClient).toHaveBeenCalledTimes(1);
    });

    it("does not share the memo across two distinct identities", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
      await authorizeLedger(
        identity({ userId: "owner-1" }),
        "owner/main",
        "read",
        deps,
      );
      await authorizeLedger(
        identity({ userId: "owner-1" }),
        "owner/main",
        "read",
        deps,
      );
      expect(mockGetUserByUsername).toHaveBeenCalledTimes(2);
    });

    it("does not share the memo across two different ledgers", async () => {
      mockGetUserByUsername.mockResolvedValue({ id: "owner-1" });
      const id = identity({ userId: "owner-1" });
      await authorizeLedger(id, "owner/main", "read", deps);
      await authorizeLedger(id, "owner/second", "read", deps);
      expect(mockGetUserByUsername).toHaveBeenCalledTimes(2);
    });
  });
});
