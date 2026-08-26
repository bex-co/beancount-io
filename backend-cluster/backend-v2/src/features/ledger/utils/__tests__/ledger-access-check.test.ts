import {
  assertLedgerAccess,
  type AssertLedgerAccessDeps,
} from "../ledger-access-check";
import { ForbiddenError } from "@/shared/errors";

const mockGetUserByUsername = jest.fn();
const mockGetById = jest.fn();
const mockGetLedgerCollaboratorPermission = jest.fn();
const mockGetLedger = jest.fn();

const mockUserFavaApiClient = {
  collaborators: {
    getLedgerCollaboratorPermission: mockGetLedgerCollaboratorPermission,
  },
};
const mockAdminClient = { ledgers: { getLedger: mockGetLedger } };
const mockGetAdminClient = jest.fn().mockReturnValue(mockAdminClient);
const mockGetApiContext = jest
  .fn()
  .mockResolvedValue({ favaApiClient: mockUserFavaApiClient });

const deps: AssertLedgerAccessDeps = {
  db: {} as any,
  models: {
    user: {
      getUserByUsername: mockGetUserByUsername,
      getById: mockGetById,
    } as any,
  },
  favaClientFactory: {
    getAdminClient: mockGetAdminClient,
    getApiContext: mockGetApiContext,
  } as any,
};

describe("assertLedgerAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: private ledger so collaborator-failure tests still throw ForbiddenError
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { private: true, id: 999 } },
    });
    mockGetAdminClient.mockReturnValue(mockAdminClient);
    mockGetApiContext.mockResolvedValue({
      favaApiClient: mockUserFavaApiClient,
    });
  });

  it("should throw ForbiddenError for a malformed ledger ID", async () => {
    await expect(
      assertLedgerAccess("no-slash-here", "user1", deps),
    ).rejects.toThrow(ForbiddenError);
    expect(mockGetUserByUsername).not.toHaveBeenCalled();
  });

  it("should throw ForbiddenError when owner does not exist", async () => {
    mockGetUserByUsername.mockResolvedValue(null);

    await expect(
      assertLedgerAccess("owner/ledger", "user1", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("should return admin permission when requesting user is the ledger owner", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "user1",
      ledger_username: "owner",
    });

    const result = await assertLedgerAccess("owner/ledger", "user1", deps);

    expect(result).toEqual({
      permission: "admin",
      ledgerOwnerId: "user1",
      ledgerRepoId: 999,
    });
  });

  it("should throw ForbiddenError when requesting user is not found", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue(null);

    await expect(
      assertLedgerAccess("owner/ledger", "user2", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw ForbiddenError when collaborator check returns false and ledger is private", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: false },
    });
    // mockGetLedger already returns private: true from beforeEach

    await expect(
      assertLedgerAccess("owner/ledger", "user2", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("should return read permission when user has no collaborator role and ledger is public", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: true, data: { permission: null } },
    });
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { private: false, id: 999 } },
    });

    const result = await assertLedgerAccess("owner/ledger", "user2", deps);

    expect(result).toEqual({
      permission: "read",
      ledgerOwnerId: "ownerUser",
      ledgerRepoId: 999,
    });
  });

  it("should throw ForbiddenError when collaborator check returns no permission and ledger is private", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: true, data: { permission: null } },
    });
    // mockGetLedger already returns private: true from beforeEach

    await expect(
      assertLedgerAccess("owner/ledger", "user2", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("should return collaborator permission", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: true, data: { permission: "write" } },
    });

    const result = await assertLedgerAccess("owner/ledger", "user2", deps);

    expect(result).toEqual({
      permission: "write",
      ledgerOwnerId: "ownerUser",
      ledgerRepoId: 999,
    });
    expect(mockGetLedgerCollaboratorPermission).toHaveBeenCalledWith(
      "owner",
      "ledger",
      "user2",
    );
    // Ledger detail is now fetched up front for every branch (needed for ledgerRepoId).
    expect(mockGetAdminClient).toHaveBeenCalled();
  });

  it("should fall back to visibility check and throw ForbiddenError when collaborator check throws and ledger is private", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockRejectedValue(
      new Error("Network error"),
    );
    // mockGetLedger already returns private: true from beforeEach

    await expect(
      assertLedgerAccess("owner/ledger", "user2", deps),
    ).rejects.toThrow(ForbiddenError);
    expect(mockGetLedger).toHaveBeenCalled();
  });

  it("should fall back to visibility check and return read when collaborator check throws and ledger is public", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockRejectedValue(
      new Error("Network error"),
    );
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { private: false, id: 999 } },
    });

    const result = await assertLedgerAccess("owner/ledger", "user2", deps);

    expect(result).toEqual({
      permission: "read",
      ledgerOwnerId: "ownerUser",
      ledgerRepoId: 999,
    });
    expect(mockGetLedger).toHaveBeenCalled();
  });

  it("should throw ForbiddenError when admin client cannot confirm public access", async () => {
    mockGetUserByUsername.mockResolvedValue({
      id: "ownerUser",
      ledger_username: "owner",
    });
    mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    mockGetLedgerCollaboratorPermission.mockResolvedValue({
      data: { success: false },
    });
    mockGetLedger.mockResolvedValue({ data: { success: false } });

    await expect(
      assertLedgerAccess("owner/ledger", "user2", deps),
    ).rejects.toThrow(ForbiddenError);
  });

  // The ledger service relays Gitea's permission verbatim, and Gitea answers a
  // repo the caller has no access to with a 200 carrying "none" — not an error.
  // Trusting that string outranked every rel, so a non-collaborator got admin
  // on a private ledger.
  describe("out-of-vocabulary collaborator permissions", () => {
    beforeEach(() => {
      mockGetUserByUsername.mockResolvedValue({
        id: "ownerUser",
        ledger_username: "owner",
      });
      mockGetById.mockResolvedValue({ id: "user2", ledger_username: "user2" });
    });

    it.each(["none", "owner", "ADMIN", "", "banana"])(
      "should throw ForbiddenError on a private ledger for permission %p",
      async (permission) => {
        mockGetLedgerCollaboratorPermission.mockResolvedValue({
          data: { success: true, data: { permission } },
        });
        // mockGetLedger already returns private: true from beforeEach

        await expect(
          assertLedgerAccess("owner/ledger", "user2", deps),
        ).rejects.toThrow(ForbiddenError);
      },
    );

    it("should fall through to plain read on a public ledger, not the raw value", async () => {
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: { success: true, data: { permission: "none" } },
      });
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: false, id: 999 } },
      });

      const result = await assertLedgerAccess("owner/ledger", "user2", deps);

      expect(result).toEqual({
        permission: "read",
        ledgerOwnerId: "ownerUser",
        ledgerRepoId: 999,
      });
    });
  });
});
