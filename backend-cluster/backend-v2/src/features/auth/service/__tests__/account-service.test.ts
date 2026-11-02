import "reflect-metadata";
import { AccountService } from "../account-service";
import { BadUserInputError, ErrorCategory } from "@/shared/errors";
import {
  NotFoundError,
  ConflictError,
  InternalServerError,
  ValidationError,
} from "@/shared/errors";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IPlaidClient } from "@/features/plaid/service/plaid-client";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";

jest.mock("@/shared/lock");
jest.mock("@/features/stripe/operations/get-user-tier");
jest.mock("@/features/plaid/utils/encryption", () => ({
  decryptToken: jest.fn().mockReturnValue("decrypted-access-token"),
}));

import { lock } from "@/shared/lock";

describe("AccountService", () => {
  let accountService: AccountService;
  let mockModels: any;
  let mockDb: any;
  let mockStripe: jest.Mocked<IStripeService>;
  let mockFavaClientFactory: jest.Mocked<IFavaClientFactory>;
  let mockPlaidClient: jest.Mocked<IPlaidClient>;
  let mockAuthorization: jest.Mocked<IAuthorizationService>;

  const identity = (userId: string): Identity => {
    return {
      userId,
      method: "session",
      scopes: new Set(),
    };
  };

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
            listUserLedgers: jest.fn().mockResolvedValue({
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

    mockAuthorization = {
      authorize: jest.fn(),
      authorizeOrThrow: jest.fn(async (input) => ({
        allowed: true as const,
        action: input.action,
        resource: input.resource,
      })),
    } as jest.Mocked<IAuthorizationService>;

    mockModels = {
      user: {
        getByMail: jest.fn(),
        getById: jest.fn(),
        updateUsername: jest.fn(),
        updateUser: jest.fn(),
        deleteByUserId: jest.fn(),
        getUserByUsername: jest.fn(),
        findUserByEmailOrUsername: jest.fn(),
      },
      jwt: {
        deleteByUserId: jest.fn(),
      },
      oauthGrant: {
        revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      },
      apiKey: {
        deleteByUserId: jest.fn().mockResolvedValue(undefined),
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
      mockAuthorization,
    );
  });

  describe("centralized authorization boundary", () => {
    it.each([
      ["profile read", AUTHORIZATION_ACTIONS.USER_PROFILE_READ],
      ["profile search", AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH],
      ["username update", AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE],
      ["profile update", AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE],
      ["account deletion", AUTHORIZATION_ACTIONS.USER_DELETE],
    ] as const)(
      "maps %s to its canonical action before domain work",
      async (operation, action) => {
        mockAuthorization.authorizeOrThrow.mockRejectedValueOnce(
          new Error("denied"),
        );
        const principal = identity("user-123");
        const result =
          operation === "profile read"
            ? accountService.getUserProfile(principal, "user-123")
            : operation === "profile search"
              ? accountService.findUsersByEmailOrUsername(
                  principal,
                  "alice@example.com",
                  false,
                )
              : operation === "username update"
                ? accountService.updateUsername(principal, "alice")
                : operation === "profile update"
                  ? accountService.updateProfile(principal, {
                      firstName: "Alice",
                      lastName: "A",
                    })
                  : accountService.deleteAccount(principal);

        await expect(result).rejects.toThrow("denied");
        expect(mockAuthorization.authorizeOrThrow).toHaveBeenCalledWith({
          principal,
          action,
          resource: "user:user-123",
        });
        expect(mockModels.user.getById).not.toHaveBeenCalled();
      },
    );
  });

  describe("findUsersByEmailOrUsername", () => {
    const alice = {
      id: "user-456",
      email: "Alice@Example.com",
      ledger_username: "alice",
    };

    it("withholds the email when the keyword matched the username", async () => {
      mockModels.user.findUserByEmailOrUsername.mockResolvedValue([alice]);

      await expect(
        accountService.findUsersByEmailOrUsername(
          identity("user-123"),
          "ALICE",
          false,
        ),
      ).resolves.toEqual([{ username: "alice", email: null }]);
    });

    it("returns the email when the keyword was that email", async () => {
      mockModels.user.findUserByEmailOrUsername.mockResolvedValue([alice]);

      await expect(
        accountService.findUsersByEmailOrUsername(
          identity("user-123"),
          "alice@example.com",
          false,
        ),
      ).resolves.toEqual([{ username: "alice", email: "Alice@Example.com" }]);
    });

    it("excludes the caller unless asked to include them", async () => {
      mockModels.user.findUserByEmailOrUsername.mockResolvedValue([alice]);

      await expect(
        accountService.findUsersByEmailOrUsername(
          identity("user-456"),
          "alice",
          false,
        ),
      ).resolves.toEqual([]);
      await expect(
        accountService.findUsersByEmailOrUsername(
          identity("user-456"),
          "alice",
          true,
        ),
      ).resolves.toEqual([{ username: "alice", email: null }]);
    });
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
            listUserLedgers: jest.fn().mockResolvedValue({
              data: { success: true, data: [] },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

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
        defaultCurrency: null,
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
            listUserLedgers: jest.fn().mockResolvedValue({
              data: { success: true, data: [] },
            }),
          },
        },
        favaUser: { username: "user123", password: "password" },
      });

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

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
        defaultCurrency: null,
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
      mockModels.paidCustomer.findByUserId = jest.fn().mockResolvedValue([
        {
          id: "pc1",
          userId,
          stripeCustomerId: "cus_1",
          clientId: "client-a",
        },
      ]);

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

      expect(result!.hasEverSubscribed).toBe(true);
    });

    it("should return null if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);

      const result = await accountService.getUserProfile(
        identity("nonexistent-user"),
        "nonexistent-user",
      );

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
            listUserLedgers: jest.fn().mockResolvedValue({
              data: { success: false, data: null },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

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
            listUserLedgers: jest.fn().mockResolvedValue({
              data: {
                success: true,
                data: [
                  {
                    id: 1,
                    name: "my-ledger",
                    full_name: "johndoe/my-ledger",
                    permissions: { admin: true, pull: true, push: true },
                  },
                ],
              },
            }),
          },
        },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

      expect(result!.limits.ledgersUsed).toBe(1);
    });

    it("counts the owner's own ledgers on every page, not only the first", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        id: userId,
        email: "test@example.com",
        ledger_username: "johndoe",
        ledger_password: "password",
      });
      // 145 owned ledgers: pages of 50, 50 and 45.
      const all = Array.from({ length: 145 }, (_, i) => ({
        full_name: `johndoe/books-${i}`,
      }));
      const listUserLedgers = jest.fn(
        (_owner: string, { page, limit }: { page: number; limit: number }) =>
          Promise.resolve({
            data: {
              success: true,
              data: all.slice((page - 1) * limit, page * limit),
            },
          }),
      );
      (mockFavaClientFactory.getApiContext as jest.Mock).mockResolvedValue({
        favaApiClient: { ledgers: { listUserLedgers } },
        favaUser: { username: "johndoe", password: "password" },
      });

      const result = await accountService.getUserProfile(
        identity(userId),
        userId,
      );

      expect(result!.limits.ledgersUsed).toBe(145);
      expect(listUserLedgers).toHaveBeenCalledTimes(3);
      expect(listUserLedgers).toHaveBeenCalledWith("johndoe", {
        page: 3,
        limit: 50,
      });
    });
  });

  describe("deleteAccount", () => {
    it("deletes the account after the caller has been authorized", async () => {
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

      const result = await accountService.deleteAccount(identity(userId));

      expect(result).toBe(true);
      expect(mockModels.user.deleteByUserId).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
      );
    });

    // A deleted account's OAuth refresh tokens used to keep minting access
    // tokens: the provider's findAccount answers for a user that is gone
    // (w0/054). They are now revoked with the sessions.
    it("revokes the user's OAuth grants in the deletion transaction", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest
        .fn()
        .mockResolvedValue({ email: "test@example.com", ledger_username: "t" });

      await accountService.deleteAccount(identity(userId));

      const [tx] = mockModels.jwt.deleteByUserId.mock.calls[0];
      expect(mockModels.oauthGrant.revokeAllForUser).toHaveBeenCalledWith(
        tx,
        userId,
      );
      expect(mockModels.user.deleteByUserId).toHaveBeenCalledWith(tx, userId);
    });

    // w21/157: Stripe and Plaid ran before the purge, so a failed purge left
    // a live account with its subscription cancelled and its banks unlinked.
    it("touches neither billing nor banks when the ledger purge fails", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest
        .fn()
        .mockResolvedValue({ email: "test@example.com", ledger_username: "t" });
      mockModels.paidCustomer.findByUserId = jest
        .fn()
        .mockResolvedValue([{ userId, clientId: "client_123" }]);
      mockStripe.listSubscriptions.mockResolvedValue([
        { id: "sub_123", clientId: "client_123", status: "active" } as any,
      ]);
      mockModels.plaidItem.getByUserId = jest
        .fn()
        .mockResolvedValue([{ id: "item_1", accessToken: "x" }]);
      const admin = mockFavaClientFactory.getAdminClient().admin;
      (admin.deleteUser as jest.Mock).mockRejectedValue(
        new Error("Ledger service unavailable"),
      );

      await expect(
        accountService.deleteAccount(identity(userId)),
      ).rejects.toThrow("Ledger service unavailable");
      expect(mockStripe.deleteSubscription).not.toHaveBeenCalled();
      expect(mockPlaidClient.removeItem).not.toHaveBeenCalled();
      expect(mockModels.user.deleteByUserId).not.toHaveBeenCalled();
    });

    it("completes a retry whose purge already happened (404)", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest
        .fn()
        .mockResolvedValue({ email: "test@example.com", ledger_username: "t" });
      const admin = mockFavaClientFactory.getAdminClient().admin;
      (admin.deleteUser as jest.Mock).mockRejectedValue(
        Object.assign(new Error("Not Found"), { status: 404 }),
      );

      await expect(
        accountService.deleteAccount(identity(userId)),
      ).resolves.toBe(true);
      expect(mockModels.user.deleteByUserId).toHaveBeenCalled();
    });

    // w21/156: `api_keys` has no foreign key, so nothing cascaded.
    it("deletes the user's API keys in the deletion transaction", async () => {
      const userId = "user-123";
      mockModels.user.getById = jest
        .fn()
        .mockResolvedValue({ email: "test@example.com", ledger_username: "t" });

      await accountService.deleteAccount(identity(userId));

      const [tx] = mockModels.jwt.deleteByUserId.mock.calls[0];
      expect(mockModels.apiKey.deleteByUserId).toHaveBeenCalledWith(tx, userId);
    });

    it("should throw error if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);

      await expect(
        accountService.deleteAccount(identity("nonexistent-user")),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.deleteAccount(identity("nonexistent-user")),
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

      const result = await accountService.deleteAccount(identity(userId));

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
        accountService.deleteAccount(identity(userId)),
      ).rejects.toThrow(InternalServerError);
      await expect(
        accountService.deleteAccount(identity(userId)),
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

      const result = await accountService.deleteAccount(identity(userId));

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

      const result = await accountService.deleteAccount(identity(userId));

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

      const result = await accountService.deleteAccount(identity(userId));

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

      const result = await accountService.deleteAccount(identity(userId));

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

      const result = await accountService.deleteAccount(identity(userId));

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

      const result = await accountService.deleteAccount(identity(userId));

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

      await accountService.updateUsername(identity(userId), newUsername);

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
        accountService.updateUsername(identity(userId), "newusername"),
      ).rejects.toThrow("Database error");
    });

    it("should throw error if user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await expect(
        accountService.updateUsername(
          identity("nonexistent-user"),
          "newusername",
        ),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.updateUsername(
          identity("nonexistent-user"),
          "newusername",
        ),
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
        accountService.updateUsername(identity(userId), "takenusername"),
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

      await accountService.updateUsername(identity(userId), "sameusername");

      expect(mockModels.user.updateUsername).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        "sameusername",
      );
    });

    // Sign-up's rule, which a rename used to skip: any name the git host
    // accepted was stored, and one it refused failed as a generic error
    // (w0/036).
    it.each([
      ["uppercase", "Alice"],
      ["an accented letter", "josé"],
      ["a dot", "john.doe"],
      ["a hyphen", "john-doe"],
      ["a space", "john doe"],
      ["21 characters", "a".repeat(21)],
      ["an empty name", ""],
    ])("refuses %s before touching the account", async (_case, username) => {
      mockModels.user.getById = jest.fn();
      mockModels.user.updateUsername = jest.fn();
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      const result = accountService.updateUsername(
        identity("user-123"),
        username,
      );

      await expect(result).rejects.toBeInstanceOf(BadUserInputError);
      await expect(result).rejects.toMatchObject({
        category: ErrorCategory.BAD_USER_INPUT,
        metadata: { field: "username" },
      });
      expect(lock.acquire).not.toHaveBeenCalled();
      expect(mockModels.user.getById).not.toHaveBeenCalled();
      expect(mockModels.user.updateUsername).not.toHaveBeenCalled();
    });

    it.each([
      ["lowercase letters", "alice"],
      ["digits and underscores", "user_2026"],
      ["exactly 20 characters", "a".repeat(20)],
      ["one character", "a"],
    ])("accepts %s", async (_case, username) => {
      mockModels.user.getById = jest.fn().mockResolvedValue({
        id: "user-123",
        ledger_username: "oldusername",
      });
      mockModels.user.getUserByUsername = jest.fn().mockResolvedValue(null);
      mockModels.user.updateUsername = jest.fn().mockResolvedValue(undefined);
      (lock.acquire as jest.Mock) = jest.fn(
        async (_key, callback) => await callback(),
      );

      await accountService.updateUsername(identity("user-123"), username);

      expect(mockModels.user.updateUsername).toHaveBeenCalledWith(
        expect.any(Object),
        "user-123",
        username,
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
    const userId = "user-123";
    beforeEach(() => {
      mockModels.user = {
        ...mockModels.user,
        getById: jest
          .fn()
          .mockResolvedValue({ id: userId, email: "test@example.com" }),
        updateUser: jest.fn().mockResolvedValue(undefined),
      };
    });

    it("writes both names in one update", async () => {
      const result = await accountService.updateProfile(identity(userId), {
        firstName: "John",
        lastName: "Doe",
      });
      expect(result).not.toBeNull();
      expect(mockModels.user.updateUser).toHaveBeenCalledTimes(1);
      expect(mockModels.user.updateUser).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        { firstName: "John", lastName: "Doe" },
      );
    });

    it("should throw error when user not found", async () => {
      mockModels.user.getById = jest.fn().mockResolvedValue(null);
      await expect(
        accountService.updateProfile(identity("nonexistent-user"), {
          firstName: "John",
          lastName: "Doe",
        }),
      ).rejects.toThrow(NotFoundError);
      await expect(
        accountService.updateProfile(identity("nonexistent-user"), {
          firstName: "John",
          lastName: "Doe",
        }),
      ).rejects.toThrow(/not found/);
      expect(mockModels.user.updateUser).not.toHaveBeenCalled();
    });

    it("stores an omitted or empty name as empty, as before", async () => {
      await accountService.updateProfile(identity(userId), {
        firstName: "",
        lastName: null,
      });
      expect(mockModels.user.updateUser).toHaveBeenCalledWith(
        expect.any(Object),
        userId,
        { firstName: "", lastName: "" },
      );
    });

    describe("defaultCurrency (ADR026, w3/m60/t001)", () => {
      it("stores a supported currency and leaves the names alone when sent by itself", async () => {
        await accountService.updateProfile(identity(userId), {
          defaultCurrency: "EUR",
        });
        expect(mockModels.user.updateUser).toHaveBeenCalledWith(
          expect.any(Object),
          userId,
          { defaultCurrency: "EUR" },
        );
      });

      it("clears it with null", async () => {
        await accountService.updateProfile(identity(userId), {
          defaultCurrency: null,
        });
        expect(mockModels.user.updateUser).toHaveBeenCalledWith(
          expect.any(Object),
          userId,
          { defaultCurrency: null },
        );
      });

      it("writes names and currency together in one update", async () => {
        await accountService.updateProfile(identity(userId), {
          firstName: "John",
          lastName: "Doe",
          defaultCurrency: "GBP",
        });
        expect(mockModels.user.updateUser).toHaveBeenCalledTimes(1);
        expect(mockModels.user.updateUser).toHaveBeenCalledWith(
          expect.any(Object),
          userId,
          { firstName: "John", lastName: "Doe", defaultCurrency: "GBP" },
        );
      });

      it("refuses an unsupported code and writes nothing", async () => {
        await expect(
          accountService.updateProfile(identity(userId), {
            firstName: "John",
            defaultCurrency: "XYZ",
          }),
        ).rejects.toThrow(ValidationError);
        expect(mockModels.user.updateUser).not.toHaveBeenCalled();
      });

      it("keeps a names-only update from touching the currency", async () => {
        await accountService.updateProfile(identity(userId), {
          firstName: "John",
          lastName: "Doe",
        });
        expect(
          updatedFields(mockModels.user.updateUser as jest.Mock),
        ).not.toContain("defaultCurrency");
      });
    });
  });
});

const updatedFields = (mock: jest.Mock): string[] =>
  Object.keys((mock.mock.calls[0]?.[2] ?? {}) as object);
