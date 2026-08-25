import "reflect-metadata";
import {
  assertLedgerAccess,
  type AssertLedgerAccessDeps,
} from "../ledger-access-check";
import { IUserModel, User } from "@/features/auth/data/user-model";
import { type DbExecutor } from "@/drizzle/drizzle";
import { ForbiddenError } from "@/shared/errors";

/**
 * Tests for three-party authorization: Current User, Owner, Owner's Ledger
 *
 * These tests verify that:
 * 1. Current user can access their own ledgers
 * 2. Current user (collaborator) can access owner's ledger
 * 3. Current user is denied access to owner's ledger when not authorized
 * 4. We ALWAYS use current user's credentials, NEVER owner's credentials
 */
describe("assertLedgerAccess - Three-Party Authorization", () => {
  let mockUserModel: jest.Mocked<IUserModel>;
  let mockGetLedgerCollaboratorPermission: jest.Mock;
  let mockGetLedger: jest.Mock;
  let mockDb: DbExecutor;
  let deps: AssertLedgerAccessDeps;

  const createMockUser = (overrides?: Partial<User>): User => ({
    id: "user-123",
    email: "test@example.com",
    ledger_username: "testuser",
    ledger_password: "test-password",
    avatarUrl: "https://example.com/avatar.jpg",
    locale: "en",
    isBlocked: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {} as DbExecutor;

    mockUserModel = {
      getById: jest.fn(),
      getByMail: jest.fn(),
      getUserByUsername: jest.fn(),
      create: jest.fn(),
      findUserByEmailOrUsername: jest.fn(),
      getActiveUsersWithUsername: jest.fn(),
      verifyPassword: jest.fn(),
      deleteByUserId: jest.fn(),
      updateUser: jest.fn(),
      updatePassword: jest.fn(),
      updateLocale: jest.fn(),
      updateUsername: jest.fn(),
      updateFirstName: jest.fn(),
      updateLastName: jest.fn(),
      updateLastSeenAt: jest.fn(),
      getRecentlySeenUsers: jest.fn(),
      countUsers: jest.fn(),
      getLedgerPasswordRotationCandidates: jest.fn(),
      stageLedgerPasswordRotation: jest.fn(),
      completeLedgerPasswordRotation: jest.fn(),
    };

    mockGetLedgerCollaboratorPermission = jest.fn();
    mockGetLedger = jest.fn().mockResolvedValue({
      data: { success: true, data: { private: true, id: 555 } },
    });

    const mockUserFavaApiClient = {
      collaborators: {
        getLedgerCollaboratorPermission: mockGetLedgerCollaboratorPermission,
      },
    };
    const mockAdminClient = { ledgers: { getLedger: mockGetLedger } };

    deps = {
      db: mockDb,
      models: { user: mockUserModel },
      favaClientFactory: {
        getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
        getApiContext: jest
          .fn()
          .mockResolvedValue({ favaApiClient: mockUserFavaApiClient }),
      } as any,
    };
  });

  describe("Scenario 1: Current user accesses their own ledger", () => {
    it("should allow Alice to access her own ledger with admin permission", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
        email: "alice@example.com",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);

      const result = await assertLedgerAccess(
        "alice/my-finances",
        "alice-id",
        deps,
      );

      expect(result).toEqual({
        permission: "admin",
        ledgerOwnerId: "alice-id",
        ledgerRepoId: 555,
      });
      expect(mockUserModel.getUserByUsername).toHaveBeenCalledWith(
        mockDb,
        "alice",
      );
      expect(mockUserModel.getUserByUsername).toHaveBeenCalledTimes(1);
      expect(mockGetLedgerCollaboratorPermission).not.toHaveBeenCalled();
      expect(mockUserModel.getById).not.toHaveBeenCalled();
    });
  });

  describe("Scenario 2: Current user (collaborator) accesses owner's ledger", () => {
    it("should allow Bob (collaborator) to access Alice's ledger with write permission", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });
      const bob = createMockUser({ id: "bob-id", ledger_username: "bob" });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(bob);
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: {
          success: true,
          data: { permission: "write", role_name: "Writer" },
        },
      });

      const result = await assertLedgerAccess(
        "alice/company-books",
        "bob-id",
        deps,
      );

      expect(result).toEqual({
        permission: "write",
        ledgerOwnerId: "alice-id",
        ledgerRepoId: 555,
      });
      expect(mockUserModel.getUserByUsername).toHaveBeenCalledWith(
        mockDb,
        "alice",
      );
      expect(mockUserModel.getById).toHaveBeenCalledWith(mockDb, "bob-id");
      expect(mockGetLedgerCollaboratorPermission).toHaveBeenCalledWith(
        "alice",
        "company-books",
        "bob", // CURRENT USER's username (Bob, not Alice!)
      );
    });

    it("should verify we use current user's ledger_username for the Fava permission check", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
        ledger_password: "alice-secret-password",
      });
      const bob = createMockUser({
        id: "bob-id",
        ledger_username: "bob",
        ledger_password: "bob-secret-password",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(bob);
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: { success: true, data: { permission: "read" } },
      });

      await assertLedgerAccess("alice/finances", "bob-id", deps);

      expect(mockGetLedgerCollaboratorPermission).toHaveBeenCalledWith(
        "alice",
        "finances",
        "bob",
      );
    });
  });

  describe("Scenario 3: Current user denied access to owner's ledger", () => {
    it("should throw ForbiddenError when Charlie is not a collaborator on Alice's private ledger", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });
      const charlie = createMockUser({
        id: "charlie-id",
        ledger_username: "charlie",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(charlie);
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: { success: false, data: null },
      });
      // mockGetLedger already returns private: true from beforeEach

      await expect(
        assertLedgerAccess("alice/secret-ledger", "charlie-id", deps),
      ).rejects.toThrow(ForbiddenError);

      expect(mockGetLedgerCollaboratorPermission).toHaveBeenCalledWith(
        "alice",
        "secret-ledger",
        "charlie",
      );
    });

    it("should return read when Charlie has no collaborator role and Alice's ledger is public", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });
      const charlie = createMockUser({
        id: "charlie-id",
        ledger_username: "charlie",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(charlie);
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: { success: true, data: { permission: null } },
      });
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: false, id: 555 } },
      });

      const result = await assertLedgerAccess(
        "alice/public-ledger",
        "charlie-id",
        deps,
      );

      expect(result).toEqual({
        permission: "read",
        ledgerOwnerId: "alice-id",
        ledgerRepoId: 555,
      });
    });

    it("should throw ForbiddenError when ledger owner does not exist", async () => {
      mockUserModel.getUserByUsername.mockResolvedValue(null);

      await expect(
        assertLedgerAccess("nonexistent-user/some-ledger", "bob-id", deps),
      ).rejects.toThrow(ForbiddenError);

      expect(mockGetLedgerCollaboratorPermission).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenError when current user does not exist", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(null);

      await expect(
        assertLedgerAccess("alice/ledger", "nonexistent-id", deps),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Edge Cases", () => {
    it("should fall back to visibility check and throw ForbiddenError when Fava API throws and ledger is private", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });
      const bob = createMockUser({ id: "bob-id", ledger_username: "bob" });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(bob);
      mockGetLedgerCollaboratorPermission.mockRejectedValue(
        new Error("Network error"),
      );
      // mockGetLedger already returns private: true from beforeEach

      await expect(
        assertLedgerAccess("alice/ledger", "bob-id", deps),
      ).rejects.toThrow(ForbiddenError);
      expect(mockGetLedger).toHaveBeenCalled();
    });

    it("should fall back to visibility check and return read when Fava API throws and ledger is public", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });
      const bob = createMockUser({ id: "bob-id", ledger_username: "bob" });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(bob);
      mockGetLedgerCollaboratorPermission.mockRejectedValue(
        new Error("Network error"),
      );
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: false, id: 555 } },
      });

      const result = await assertLedgerAccess("alice/ledger", "bob-id", deps);

      expect(result).toEqual({
        permission: "read",
        ledgerOwnerId: "alice-id",
        ledgerRepoId: 555,
      });
      expect(mockGetLedger).toHaveBeenCalled();
    });

    it("should handle ledger names with special characters", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);

      const result = await assertLedgerAccess(
        "alice/my-ledger-2024_v2",
        "alice-id",
        deps,
      );

      expect(result).toEqual({
        permission: "admin",
        ledgerOwnerId: "alice-id",
        ledgerRepoId: 555,
      });
    });
  });

  describe("Security Verification", () => {
    it("should never confuse current user with owner", async () => {
      const alice = createMockUser({
        id: "alice-id",
        ledger_username: "alice",
        ledger_password: "alice-password",
      });
      const bob = createMockUser({
        id: "bob-id",
        ledger_username: "bob",
        ledger_password: "bob-password",
      });

      mockUserModel.getUserByUsername.mockResolvedValue(alice);
      mockUserModel.getById.mockResolvedValue(bob);
      mockGetLedgerCollaboratorPermission.mockResolvedValue({
        data: { success: true, data: { permission: "admin" } },
      });

      await assertLedgerAccess("alice/finances", "bob-id", deps);

      expect(mockUserModel.getUserByUsername).toHaveBeenCalledWith(
        mockDb,
        "alice",
      );
      expect(mockUserModel.getById).toHaveBeenCalledWith(mockDb, "bob-id");

      const [ownerArg, ledgerArg, currentUserArg] =
        mockGetLedgerCollaboratorPermission.mock.calls[0];
      expect(ownerArg).toBe("alice");
      expect(ledgerArg).toBe("finances");
      expect(currentUserArg).toBe("bob"); // CURRENT USER's username (critical!)
    });
  });
});
