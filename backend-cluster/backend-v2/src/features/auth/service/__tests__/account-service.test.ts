import "reflect-metadata";
import { AccountService } from "../account-service";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from "@/shared/errors";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IPlaidClient } from "@/features/plaid/service/plaid-client";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import type { Identity } from "@/server/api/identity";
import { MOBILE_CLIENT_ID } from "@/features/oauth/constants";

jest.mock("@/shared/lock");
jest.mock("@/features/stripe/operations/get-user-tier");
jest.mock("@/features/plaid/utils/encryption", () => ({
  decryptToken: jest.fn().mockReturnValue("decrypted-access-token"),
}));

import { lock } from "@/shared/lock";

const sessionIdentity = (userId: string): Identity => ({
  userId,
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
});

const mobileIdentity = (userId: string): Identity => ({
  userId,
  method: "oauth",
  oauthClientId: MOBILE_CLIENT_ID,
  scopes: new Set(["ledger.admin"]),
  capabilityExempt: false,
});

describe("AccountService", () => {
  let accountService: AccountService;
  let mockModels: any;
  let mockDb: any;
  let mockStripe: jest.Mocked<IStripeService>;
  let mockFavaClientFactory: jest.Mocked<IFavaClientFactory>;
  let mockPlaidClient: jest.Mocked<IPlaidClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    (getUserTier as jest.Mock).mockResolvedValue(SubscriptionTier.FREE);

    mockDb = {
      transaction: jest.fn((callback) => {
        const mockTx = {};
        return callback(mockTx);
      }),
    };

    mockStripe = {
      listSubscriptions: jest.fn().mockResolvedValue([]),
      deleteSubscription: jest.fn().mockResolvedValue({ success: true }),
      updateCustomerEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IStripeService>;

    mockFavaClientFactory = {
      getApiContext: jest.fn().mockResolvedValue({
        favaApiClient: {
          ledgers: {
            listLedgers: jest.fn().mockResolvedValue({
              data: { success: true, data: [] },
            }),
          },
        },
        favaUser: { username: "testuser", password: "testpass" },
      }),
      getAdminClient: jest.fn().mockReturnValue({
        admin: {
          deleteUser: jest.fn().mockResolvedValue(undefined),
          renameUser: jest.fn().mockResolvedValue(undefined),
          editUser: jest.fn().mockResolvedValue(undefined),
        },
      }),
      getPublicApiClient: jest.fn(),
    } as unknown as jest.Mocked<IFavaClientFactory>;

    mockPlaidClient = {
      removeItem: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPlaidClient>;

    mockModels = {
      user: {
        getByMail: jest.fn(),
        getById: jest.fn(),
        updateUsername: jest.fn(),
        updateUser: jest.fn(),
        deleteByUserId: jest.fn(),
        getUserByUsername: jest.fn(),
      },
      jwt: {
        deleteByUserId: jest.fn(),
      },
      emailToken: {
        deleteByUserId: jest.fn(),
      },
      paidCustomer: {
        findByUserId: jest.fn().mockResolvedValue([]),
        deleteByUserId: jest.fn(),
        updateCustomerById: jest.fn(),
      },
      plaidItem: {
        getByUserId: jest.fn().mockResolvedValue([]),
        deleteByUserId: jest.fn().mockResolvedValue(undefined),
      },
    };

    accountService = new AccountService(
      mockModels,
      mockDb,
      mockStripe,
      mockFavaClientFactory,
      mockPlaidClient,
    );
  });

  describe("getUserProfile", () => {
    it("should return user profile with OFF report status (report subscription removed)", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        ledger_username: "johndoe",
        ledger_password: "password",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      (mockFavaClientFactory.getApiContext as jest.Mock).mockResolvedValue({
        favaApiClient: {
          ledgers: {
            listLedgers: jest.fn().mockResolvedValue({
              data: { success: true, data: [] },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        emailReportStatus: ReportStatus.OFF,
        username: "johndoe",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      });
    });

    it("should return profile with default values when firstName/lastName are null", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: null,
        lastName: null,
        ledger_username: "user123",
        ledger_password: "password",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      (mockFavaClientFactory.getApiContext as jest.Mock).mockResolvedValue({
        favaApiClient: {
          ledgers: {
            listLedgers: jest.fn().mockResolvedValue({
              data: { success: true, data: [] },
            }),
          },
        },
        favaUser: { username: "user123", password: "password" },
      });

      const result = await accountService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "",
        lastName: "",
        emailReportStatus: ReportStatus.OFF,
        username: "user123",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      });
    });

    it("should report hasEverSubscribed=true when the user has a paidCustomer record", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        ledger_username: "johndoe",
        ledger_password: "password",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([
          {
            id: "pc1",
            userId,
            stripeCustomerId: "cus_1",
            clientId: "client-a",
          },
        ]);

      const result = await accountService.getUserProfile(userId);

      expect(result!.hasEverSubscribed).toBe(true);
    });

    it("should return null if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);

      const result = await accountService.getUserProfile("nonexistent-user");

      expect(result).toBeNull();
    });

    it("should return 0 ledgersUsed when Fava API returns failure response", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        ledger_username: "johndoe",
        ledger_password: "password",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      (mockFavaClientFactory.getApiContext as jest.Mock).mockResolvedValue({
        favaApiClient: {
          ledgers: {
            listLedgers: jest.fn().mockResolvedValue({
              data: { success: false, data: null },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(userId);

      expect(result).not.toBeNull();
      expect(result!.limits.ledgersUsed).toBe(0);
    });

    it("should correctly count only ledgers owned by the user", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        ledger_username: "johndoe",
        ledger_password: "password",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      (mockFavaClientFactory.getApiContext as jest.Mock).mockResolvedValue({
        favaApiClient: {
          ledgers: {
            listLedgers: jest.fn().mockResolvedValue({
              data: {
                success: true,
                data: [
                  {
                    id: 1,
                    name: "my-ledger",
                    full_name: "johndoe/my-ledger",
                    permissions: { admin: true, pull: true, push: true },
                  },
                  {
                    id: 2,
                    name: "other-ledger",
                    full_name: "otheruser/other-ledger",
                    permissions: { admin: false, pull: true, push: false },
                  },
                ],
              },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(userId);

      expect(result!.limits.ledgersUsed).toBe(1);
    });
  });

  describe("deleteAccount", () => {
    it("rejects a scoped credential before reading account data", async () => {
      await expect(
        accountService.deleteAccount({
          userId: "user-123",
          method: "oauth",
          scopes: new Set(["ledger.admin"]),
          capabilityExempt: false,
        }),
      ).rejects.toThrow(ForbiddenError);

      expect(mockModels.user.getById).not.toHaveBeenCalled();
    });

    it("deletes the account for a first-party native app session", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      mockModels.paidCustomer.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.jwt.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockModels.emailToken.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.user.deleteByUserId = jest.fn().mockResolvedValue(undefined);

      const result = await accountService.deleteAccount(mobileIdentity(userId));

      expect(result).toBe(true);
      expect(mockModels.user.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
    });

    it("should throw error if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);

      await expect(
        accountService.deleteAccount(sessionIdentity("nonexistent-user")),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.deleteAccount(sessionIdentity("nonexistent-user")),
      ).rejects.toThrow(/not found/);
    });

    it("should cancel active subscriptions before deleting account", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([
          { userId, stripeCustomerId: "cus_123", clientId: "client_123" },
        ]);
      mockStripe.listSubscriptions.mockResolvedValue([
        { id: "sub_123", clientId: "client_123", status: "active" } as any,
      ]);
      mockStripe.deleteSubscription.mockResolvedValue({ success: true });

      mockModels.paidCustomer.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.jwt.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockModels.emailToken.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.user.deleteByUserId = jest.fn().mockResolvedValue(undefined);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockStripe.deleteSubscription).toHaveBeenCalledWith(
        "sub_123",
        userId,
        "client_123",
      );
    });

    it("should throw error if subscription cancellation fails", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([
          { userId, stripeCustomerId: "cus_123", clientId: "client_123" },
        ]);
      mockStripe.listSubscriptions.mockResolvedValue([
        { id: "sub_123", clientId: "client_123", status: "active" } as any,
      ]);
      mockStripe.deleteSubscription.mockResolvedValue({
        success: false,
        message: "Payment required",
      });

      await expect(
        accountService.deleteAccount(sessionIdentity(userId)),
      ).rejects.toThrow(InternalServerError);
      await expect(
        accountService.deleteAccount(sessionIdentity(userId)),
      ).rejects.toThrow("Payment required");
    });

    it("should skip already canceled subscriptions", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([
          { userId, stripeCustomerId: "cus_123", clientId: "client_123" },
        ]);
      mockStripe.listSubscriptions.mockResolvedValue([
        {
          id: "sub_canceled",
          clientId: "client_123",
          status: "canceled",
        } as any,
        {
          id: "sub_expired",
          clientId: "client_123",
          status: "incomplete_expired",
        } as any,
      ]);

      mockModels.paidCustomer.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.jwt.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockModels.emailToken.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.user.deleteByUserId = jest.fn().mockResolvedValue(undefined);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockStripe.deleteSubscription).not.toHaveBeenCalled();
    });

    it("should skip subscriptions with invalid id or clientId", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([
          { userId, stripeCustomerId: "cus_123", clientId: "client_123" },
        ]);
      mockStripe.listSubscriptions.mockResolvedValue([
        { id: null, clientId: "client_123", status: "active" } as any,
        { id: "sub_123", clientId: undefined, status: "active" } as any,
        { id: "sub_valid", clientId: "client_123", status: "active" } as any,
      ]);
      mockStripe.deleteSubscription.mockResolvedValue({ success: true });

      mockModels.paidCustomer.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.jwt.deleteByUserId = jest.fn().mockResolvedValue(undefined);
      mockModels.emailToken.deleteByUserId = jest
        .fn()
        .mockResolvedValue(undefined);
      mockModels.user.deleteByUserId = jest.fn().mockResolvedValue(undefined);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockStripe.deleteSubscription).toHaveBeenCalledTimes(1);
      expect(mockStripe.deleteSubscription).toHaveBeenCalledWith(
        "sub_valid",
        userId,
        "client_123",
      );
    });

    it("should unlink Plaid items best-effort and delete them from the database", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      mockModels.plaidItem.getByUserId = jest.fn().mockResolvedValue([
        { id: "pitm_1", accessToken: "encrypted-token-1" },
        { id: "pitm_2", accessToken: "encrypted-token-2" },
      ]);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockPlaidClient.removeItem).toHaveBeenCalledTimes(2);
      expect(mockModels.plaidItem.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
    });

    it("should still succeed and delete locally when Plaid removeItem fails for one item", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      mockModels.plaidItem.getByUserId = jest.fn().mockResolvedValue([
        { id: "pitm_1", accessToken: "encrypted-token-1" },
        { id: "pitm_2", accessToken: "encrypted-token-2" },
      ]);
      mockPlaidClient.removeItem = jest
        .fn()
        .mockRejectedValueOnce(new Error("Plaid unavailable"))
        .mockResolvedValueOnce(undefined);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockModels.plaidItem.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
      expect(mockModels.user.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
    });

    it("should succeed without calling Plaid when the user has zero Plaid items", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      mockModels.plaidItem.getByUserId = jest.fn().mockResolvedValue([]);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockPlaidClient.removeItem).not.toHaveBeenCalled();
      expect(mockModels.plaidItem.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
    });

    it("should clean up Plaid items even when the user has no paidCustomer rows", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "testuser",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      mockModels.plaidItem.getByUserId = jest
        .fn()
        .mockResolvedValue([
          { id: "pitm_1", accessToken: "encrypted-token-1" },
        ]);

      const result = await accountService.deleteAccount(
        sessionIdentity(userId),
      );

      expect(result).toBe(true);
      expect(mockStripe.deleteSubscription).not.toHaveBeenCalled();
      expect(mockPlaidClient.removeItem).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateUsername", () => {
    it("should update username successfully", async () => {
      const userId = "user-123";
      const newUsername = "newusername";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "oldusername",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user.updateUsername = jest.fn().mockResolvedValue(undefined);

      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateUsername(userId, newUsername);

      expect(mockModels.user.updateUsername).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        newUsername,
      );
    });

    it("should propagate errors when update fails", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        ledger_username: "oldusername",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user.updateUsername = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateUsername(userId, "newusername"),
      ).rejects.toThrow("Database error");
    });

    it("should throw error if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateUsername("nonexistent-user", "newusername"),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.updateUsername("nonexistent-user", "newusername"),
      ).rejects.toThrow(/not found/);
    });

    it("should throw conflict error if username is taken by another user", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        ledger_username: "oldusername",
      };
      const existingUser = {
        _id: "other-user-id",
        id: "other-user-id",
        email: "other@example.com",
        ledger_username: "takenusername",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user.getUserByUsername = jest
        .fn()
        .mockResolvedValue(existingUser);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateUsername(userId, "takenusername"),
      ).rejects.toThrow(ConflictError);
    });

    it("should allow updating to own current username", async () => {
      const userId = "user-123";
      const mockUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        ledger_username: "oldusername",
      };
      const existingUser = {
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        ledger_username: "sameusername",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user.getUserByUsername = jest
        .fn()
        .mockResolvedValue(existingUser);
      mockModels.user.updateUsername = jest.fn().mockResolvedValue(undefined);

      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateUsername(userId, "sameusername");

      expect(mockModels.user.updateUsername).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "sameusername",
      );
    });
  });

  describe("updateEmail", () => {
    it("should throw error if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateEmail("nonexistent-user", "new@example.com"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should return early (no-op) when email already matches", async () => {
      const userId = "user-123";
      const email = "kwoktungdev@gmail.com";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email,
        ledger_username: "kwoktungdev",
      });
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateEmail(userId, email);

      expect(mockModels.user.updateUser).not.toHaveBeenCalled();
      expect(mockFavaClientFactory.getAdminClient).not.toHaveBeenCalled();
    });

    it("should throw conflict error if email belongs to another user", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email: "old@example.com",
        ledger_username: "olduser",
      });
      mockModels.user.getByMail = jest
        .fn()
        .mockResolvedValue({ id: "other-user-id", email: "taken@example.com" });
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateEmail(userId, "taken@example.com"),
      ).rejects.toThrow(ConflictError);
      expect(mockModels.user.updateUser).not.toHaveBeenCalled();
    });

    it("should update Postgres and the Gitea-backed ledger account when the user has no subscriptions", async () => {
      const userId = "user-123";
      const newEmail = "kwoktung.dev@gmail.com";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email: "kwoktungdev@gmail.com",
        ledger_username: "kwoktungdev",
      });
      mockModels.user.getByMail = jest.fn().mockResolvedValue(null);
      mockModels.user.updateUser = jest.fn().mockResolvedValue(undefined);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([]);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateEmail(userId, newEmail);

      expect(mockModels.user.updateUser).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        { email: newEmail },
      );
      const favaAdminClient = mockFavaClientFactory.getAdminClient();
      expect(favaAdminClient.admin.editUser).toHaveBeenCalledWith(
        "kwoktungdev",
        { login_name: "kwoktungdev", source_id: 0, email: newEmail },
      );
      expect(mockStripe.updateCustomerEmail).not.toHaveBeenCalled();
      expect(mockModels.paidCustomer.updateCustomerById).not.toHaveBeenCalled();
    });

    it("should sync the new email to Stripe for every paid-customer record", async () => {
      const userId = "user-123";
      const newEmail = "kwoktung.dev@gmail.com";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email: "kwoktungdev@gmail.com",
        ledger_username: "kwoktungdev",
      });
      mockModels.user.getByMail = jest.fn().mockResolvedValue(null);
      mockModels.user.updateUser = jest.fn().mockResolvedValue(undefined);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([
        {
          id: "pc1",
          userId,
          stripeCustomerId: "cus_abc123",
          clientId: "client-a",
        },
        {
          id: "pc2",
          userId,
          stripeCustomerId: "cus_def456",
          clientId: "client-b",
        },
      ]);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateEmail(userId, newEmail);

      expect(mockStripe.updateCustomerEmail).toHaveBeenCalledTimes(2);
      expect(mockStripe.updateCustomerEmail).toHaveBeenCalledWith(
        "cus_abc123",
        "client-a",
        newEmail,
      );
      expect(mockStripe.updateCustomerEmail).toHaveBeenCalledWith(
        "cus_def456",
        "client-b",
        newEmail,
      );
      expect(mockModels.paidCustomer.updateCustomerById).toHaveBeenCalledTimes(
        2,
      );
      expect(mockModels.paidCustomer.updateCustomerById).toHaveBeenCalledWith(
        expect.any(Object),
        "pc1",
        { email: newEmail },
      );
    });

    it("should propagate errors from the Gitea sync call", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email: "kwoktungdev@gmail.com",
        ledger_username: "kwoktungdev",
      });
      mockModels.user.getByMail = jest.fn().mockResolvedValue(null);
      mockModels.user.updateUser = jest.fn().mockResolvedValue(undefined);
      mockFavaClientFactory.getAdminClient = jest.fn().mockReturnValue({
        admin: {
          editUser: jest
            .fn()
            .mockRejectedValue(new Error("ledger service unavailable")),
        },
      });
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateEmail(userId, "kwoktung.dev@gmail.com"),
      ).rejects.toThrow("ledger service unavailable");
    });

    it("should propagate errors when a Stripe customer sync fails partway through the loop", async () => {
      const userId = "user-123";
      const newEmail = "p.an@gmail.com";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: userId,
        email: "pan@gmail.com",
        ledger_username: "pan",
      });
      mockModels.user.getByMail = jest.fn().mockResolvedValue(null);
      mockModels.user.updateUser = jest.fn().mockResolvedValue(undefined);
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([
        {
          id: "pc1",
          userId,
          stripeCustomerId: "cus_abc123",
          clientId: "client-a",
        },
        {
          id: "pc2",
          userId,
          stripeCustomerId: "cus_def456",
          clientId: "client-b",
        },
      ]);
      mockStripe.updateCustomerEmail = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Stripe unavailable"));
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateEmail(userId, newEmail),
      ).rejects.toThrow("Stripe unavailable");

      expect(mockModels.paidCustomer.updateCustomerById).toHaveBeenCalledTimes(
        1,
      );
      expect(mockModels.paidCustomer.updateCustomerById).toHaveBeenCalledWith(
        expect.any(Object),
        "pc1",
        { email: newEmail },
      );
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully", async () => {
      const userId = "user-123";
      const mockUser = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user = {
        ...mockModels.user,
        updateFirstName: jest.fn().mockResolvedValue(undefined),
        updateLastName: jest.fn().mockResolvedValue(undefined),
      };

      const result = await accountService.updateProfile(userId, "John", "Doe");

      expect(result).toBe(true);
      expect(mockModels.user.updateFirstName).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "John",
      );
      expect(mockModels.user.updateLastName).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "Doe",
      );
    });

    it("should throw error when user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);

      await expect(
        accountService.updateProfile("nonexistent-user", "John", "Doe"),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.updateProfile("nonexistent-user", "John", "Doe"),
      ).rejects.toThrow(/not found/);
    });

    it("should update profile with empty strings", async () => {
      const userId = "user-123";
      const mockUser = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
      };

      mockModels.user.getById = jest.fn().mockResolvedValue(mockUser);
      mockModels.user = {
        ...mockModels.user,
        updateFirstName: jest.fn().mockResolvedValue(undefined),
        updateLastName: jest.fn().mockResolvedValue(undefined),
      };

      const result = await accountService.updateProfile(userId, "", "");

      expect(result).toBe(true);
      expect(mockModels.user.updateFirstName).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "",
      );
      expect(mockModels.user.updateLastName).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "",
      );
    });
  });
});
