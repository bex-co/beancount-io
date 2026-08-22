import { AdminService } from "../admin-service";
import {
  NotFoundError,
  BadUserInputError,
  OperationNotAllowedError,
} from "@/shared/errors";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IAccountService } from "@/features/auth/service/account-service";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import type { CacheHelper } from "@/shared/cache";
import {
  getTierLimits,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";

jest.mock("drizzle-orm/node-postgres/migrator", () => ({
  migrate: jest.fn().mockResolvedValue(undefined),
}));

// Mock the cross-service tier operation `getLedgerDirectiveLimit` calls.
jest.mock("@/features/stripe/operations/get-user-tier");

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getUserTierLimits } from "@/features/stripe/operations/get-user-tier";

const mockMigrate = migrate as jest.Mock;
const mockGetUserTierLimits = getUserTierLimits as jest.Mock;

const mockConfig = { dashboard: { url: "https://dashboard.example.com" } };

describe("AdminService", () => {
  let service: AdminService;
  let mockDb: DbExecutor;
  let mockUserModel: jest.Mocked<
    Pick<
      IModels["user"],
      | "getByMail"
      | "getRecentlySeenUsers"
      | "updateUser"
      | "countUsers"
      | "getUserByUsername"
    >
  >;
  let mockSignupOtpSessionModel: jest.Mocked<
    Pick<IModels["signupOtpSession"], "getSessionByEmail">
  >;
  let mockMagicLinkTokenModel: jest.Mocked<
    Pick<IModels["magicLinkToken"], "regenerateToken">
  >;
  let mockPaidCustomerModel: jest.Mocked<
    Pick<
      IModels["paidCustomer"],
      "listWithActivePeriod" | "countWithActivePeriod" | "findByUserId"
    >
  >;
  let mockAccountService: jest.Mocked<Pick<IAccountService, "updateEmail">>;
  let mockStripeService: jest.Mocked<Pick<IStripeService, "listSubscriptions">>;
  let mockLedgerWorkflow: jest.Mocked<
    Pick<ILedgerWorkflow, "listUserOwnedLedgersWithDirectiveCounts">
  >;
  let mockCacheHelper: jest.Mocked<Pick<CacheHelper, "get" | "set">>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      transaction: jest.fn((callback) => {
        const mockTx = {};
        return callback(mockTx);
      }),
    } as unknown as DbExecutor;

    mockUserModel = {
      getByMail: jest.fn(),
      getRecentlySeenUsers: jest.fn(),
      updateUser: jest.fn(),
      countUsers: jest.fn(),
      getUserByUsername: jest.fn(),
    };

    mockSignupOtpSessionModel = {
      getSessionByEmail: jest.fn(),
    };

    mockMagicLinkTokenModel = {
      regenerateToken: jest.fn(),
    };

    mockPaidCustomerModel = {
      listWithActivePeriod: jest.fn(),
      countWithActivePeriod: jest.fn(),
      findByUserId: jest.fn(),
    };

    mockAccountService = {
      updateEmail: jest.fn(),
    };

    mockStripeService = {
      listSubscriptions: jest.fn(),
    };

    mockLedgerWorkflow = {
      listUserOwnedLedgersWithDirectiveCounts: jest.fn(),
    };

    mockCacheHelper = {
      get: jest.fn(),
      set: jest.fn(),
    };

    service = new AdminService(
      {
        user: mockUserModel as unknown as IModels["user"],
        signupOtpSession:
          mockSignupOtpSessionModel as unknown as IModels["signupOtpSession"],
        magicLinkToken:
          mockMagicLinkTokenModel as unknown as IModels["magicLinkToken"],
        paidCustomer:
          mockPaidCustomerModel as unknown as IModels["paidCustomer"],
      },
      mockDb,
      mockConfig,
      mockAccountService as unknown as IAccountService,
      mockStripeService as unknown as IStripeService,
      mockLedgerWorkflow as unknown as ILedgerWorkflow,
      mockCacheHelper as unknown as CacheHelper,
    );
  });

  describe("getSignupOtp", () => {
    it("should throw NotFoundError when no active signup session found", async () => {
      mockSignupOtpSessionModel.getSessionByEmail.mockResolvedValue(null);

      await expect(
        service.getSignupOtp("notfound@example.com"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should return otp and expireAt when session exists", async () => {
      const expireAt = new Date(Date.now() + 60000).toISOString();
      mockSignupOtpSessionModel.getSessionByEmail.mockResolvedValue({
        otp: "4821",
        expireAt,
      } as any);

      const result = await service.getSignupOtp("pending@example.com");

      expect(result).toEqual({ otp: "4821", expireAt });
    });
  });

  describe("listRecentUsers", () => {
    it("should return mapped users and pagination", async () => {
      const lastSeenAt = new Date("2026-05-15T10:00:00Z");
      const createAt = new Date("2025-01-01T00:00:00Z");
      mockUserModel.getRecentlySeenUsers.mockResolvedValue({
        users: [
          {
            id: "u1",
            email: "a@example.com",
            firstName: "Alice",
            lastName: "Smith",
            ledger_username: "alice",
            isBlocked: false,
            lastSeenAt,
            createAt,
          },
        ],
        total: 5,
      } as any);

      const result = await service.listRecentUsers({
        limit: 1,
        offset: 0,
        sinceHours: 24,
      });

      expect(mockUserModel.getRecentlySeenUsers).toHaveBeenCalledWith(mockDb, {
        sinceHours: 24,
        limit: 1,
        offset: 0,
      });
      expect(result.users).toEqual([
        {
          id: "u1",
          email: "a@example.com",
          firstName: "Alice",
          lastName: "Smith",
          username: "alice",
          isBlocked: false,
          lastSeenAt: lastSeenAt.toISOString(),
          createAt: createAt.toISOString(),
        },
      ]);
      expect(result.pagination).toEqual({ limit: 1, offset: 0, count: 5 });
    });
  });

  describe("listActivePaidUsers", () => {
    it("should return mapped paid users and pagination", async () => {
      const currentPeriodEnd = new Date("2026-12-31T00:00:00Z");
      const lastSeenAt = new Date("2026-06-01T00:00:00Z");
      const createAt = new Date("2025-01-01T00:00:00Z");

      mockPaidCustomerModel.listWithActivePeriod.mockResolvedValue({
        users: [
          {
            userId: "u1",
            email: "alice@example.com",
            firstName: "Alice",
            lastName: "Smith",
            ledgerUsername: "alice",
            isBlocked: false,
            lastSeenAt,
            createAt,
            stripeCustomerId: "cus_abc123",
            currentPeriodEnd,
          },
        ],
        total: 1,
      });

      const result = await service.listActivePaidUsers({
        limit: 10,
        offset: 0,
        clientId: "beancount-web-prod",
      });

      expect(mockPaidCustomerModel.listWithActivePeriod).toHaveBeenCalledWith(
        mockDb,
        { limit: 10, offset: 0, clientId: "beancount-web-prod" },
      );
      expect(result.users).toEqual([
        {
          id: "u1",
          email: "alice@example.com",
          firstName: "Alice",
          lastName: "Smith",
          username: "alice",
          isBlocked: false,
          lastSeenAt: lastSeenAt.toISOString(),
          createAt: createAt.toISOString(),
          stripeCustomerId: "cus_abc123",
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        },
      ]);
      expect(result.pagination).toEqual({ limit: 10, offset: 0, total: 1 });
    });
  });

  describe("loginAs", () => {
    it("should throw NotFoundError when user does not exist", async () => {
      mockUserModel.getByMail.mockResolvedValue(null);

      await expect(service.loginAs("notfound@example.com")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw OperationNotAllowedError when user is blocked", async () => {
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "blocked@example.com",
        isBlocked: true,
      } as any);

      await expect(service.loginAs("blocked@example.com")).rejects.toThrow(
        OperationNotAllowedError,
      );
    });

    it("should return redirectUrl with one-time token", async () => {
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "valid@example.com",
        isBlocked: false,
      } as any);
      mockMagicLinkTokenModel.regenerateToken.mockResolvedValue({
        id: "tok123",
      } as any);

      const result = await service.loginAs("valid@example.com");

      expect(mockMagicLinkTokenModel.regenerateToken).toHaveBeenCalledWith(
        "u1",
      );
      expect(result.redirectUrl).toBe(
        "https://dashboard.example.com/auth/callback?oneTimeToken=tok123",
      );
    });
  });

  describe("runMigrations", () => {
    it("should call migrate with the correct db and migrations folder", async () => {
      await service.runMigrations();

      expect(mockMigrate).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          migrationsFolder: expect.stringContaining("drizzle/migrations"),
        }),
      );
    });
  });

  describe("getStats", () => {
    it("should return totalUsers and activePaidUsers from both models", async () => {
      mockUserModel.countUsers.mockResolvedValue(1234);
      mockPaidCustomerModel.countWithActivePeriod.mockResolvedValue(56);

      const result = await service.getStats();

      expect(mockUserModel.countUsers).toHaveBeenCalledWith(mockDb);
      expect(mockPaidCustomerModel.countWithActivePeriod).toHaveBeenCalledWith(
        mockDb,
      );
      expect(result).toEqual({ totalUsers: 1234, activePaidUsers: 56 });
    });
  });

  describe("unblockUser", () => {
    it("should throw NotFoundError when user does not exist", async () => {
      mockUserModel.getByMail.mockResolvedValue(null);

      await expect(service.unblockUser("notfound@example.com")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should return 'already unblocked' message when user is not blocked", async () => {
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "unblocked@example.com",
        isBlocked: false,
      } as any);

      const result = await service.unblockUser("unblocked@example.com");

      expect(result.message).toContain("already unblocked");
      expect(mockUserModel.updateUser).not.toHaveBeenCalled();
    });

    it("should unblock the user and return success message", async () => {
      const email = "blocked@example.com";
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email,
        isBlocked: true,
      } as any);
      mockUserModel.updateUser.mockResolvedValue({} as any);

      const result = await service.unblockUser(email);

      expect(mockUserModel.updateUser).toHaveBeenCalledWith(mockDb, "u1", {
        isBlocked: false,
      });
      expect(result.message).toContain("unblocked successfully");
    });
  });

  describe("fixUserEmail", () => {
    it("should throw NotFoundError when user does not exist", async () => {
      mockUserModel.getByMail.mockResolvedValue(null);

      await expect(
        service.fixUserEmail("notfound@gmail.com", "not.found@gmail.com"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw BadUserInputError when expectedEmail is not a dot-variant of email", async () => {
      await expect(
        service.fixUserEmail(
          "kwoktungdev@gmail.com",
          "totally-different@example.com",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(mockUserModel.getByMail).not.toHaveBeenCalled();
    });

    it("should throw BadUserInputError for mismatched non-Gmail addresses", async () => {
      await expect(
        service.fixUserEmail("jhon@example.com", "john@example.com"),
      ).rejects.toThrow(BadUserInputError);
      expect(mockUserModel.getByMail).not.toHaveBeenCalled();
    });

    it("should return 'already correct' message and not delegate when email matches", async () => {
      const email = "kwoktungdev@gmail.com";
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email,
      } as any);

      const result = await service.fixUserEmail(email, email);

      expect(result.message).toContain("already correct");
      expect(mockAccountService.updateEmail).not.toHaveBeenCalled();
    });

    it("should resolve the user by their current email and delegate to AccountService.updateEmail", async () => {
      const email = "kwoktungdev@gmail.com";
      const expectedEmail = "kwoktung.dev@gmail.com";
      mockUserModel.getByMail.mockImplementation(async (_db, lookupEmail) => {
        if (lookupEmail === email) {
          return { id: "u1", email } as any;
        }
        return null;
      });
      mockAccountService.updateEmail.mockResolvedValue(undefined);

      const result = await service.fixUserEmail(email, expectedEmail);

      expect(mockAccountService.updateEmail).toHaveBeenCalledWith(
        "u1",
        expectedEmail,
      );
      expect(result.message).toContain(email);
      expect(result.message).toContain(expectedEmail);
    });

    it("should propagate errors from AccountService.updateEmail", async () => {
      const email = "kwoktungdev@gmail.com";
      const expectedEmail = "kwoktung.dev@gmail.com";
      mockUserModel.getByMail.mockImplementation(async (_db, lookupEmail) => {
        if (lookupEmail === email) {
          return { id: "u1", email } as any;
        }
        return null;
      });
      mockAccountService.updateEmail.mockRejectedValue(
        new Error("ledger service unavailable"),
      );

      await expect(service.fixUserEmail(email, expectedEmail)).rejects.toThrow(
        "ledger service unavailable",
      );
    });
  });

  describe("getUserDetail", () => {
    it("should throw NotFoundError when user does not exist", async () => {
      mockUserModel.getByMail.mockResolvedValue(null);

      await expect(
        service.getUserDetail("notfound@example.com"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should return empty paidCustomers/subscriptions when user has none", async () => {
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Smith",
        ledger_username: "alice",
        isBlocked: false,
        avatarUrl: "gravatar.com/avatar/abc",
        locale: "en",
      } as any);
      mockPaidCustomerModel.findByUserId.mockResolvedValue([]);
      mockStripeService.listSubscriptions.mockResolvedValue([]);

      const result = await service.getUserDetail("alice@example.com");

      expect(result.paidCustomers).toEqual([]);
      expect(result.subscriptions).toEqual([]);
      expect(result.user).toEqual({
        id: "u1",
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Smith",
        username: "alice",
        isBlocked: false,
        lastSeenAt: undefined,
        createAt: undefined,
        avatarUrl: "gravatar.com/avatar/abc",
        locale: "en",
      });
    });

    it("should map paid customers and Stripe subscriptions across clients", async () => {
      const createdAt = new Date("2025-01-01T00:00:00Z");
      const updatedAt = new Date("2026-01-01T00:00:00Z");
      const currentPeriodEnd = new Date("2026-12-31T00:00:00Z");

      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "bob@example.com",
        firstName: "Bob",
        lastName: "Jones",
        ledger_username: "bob",
        isBlocked: false,
        avatarUrl: "gravatar.com/avatar/def",
        locale: "en",
      } as any);
      mockPaidCustomerModel.findByUserId.mockResolvedValue([
        {
          id: "pc1",
          userId: "u1",
          stripeCustomerId: "cus_prod",
          clientId: "beancount-web-prod",
          email: "bob@example.com",
          name: "Bob Jones",
          phone: undefined,
          currentPeriodEnd,
          createdAt,
          updatedAt,
        },
      ]);
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          id: "sub_abc",
          clientId: "beancount-web-prod",
          status: "active",
          start_date: 1735689600,
          cancel_at_period_end: false,
          cancel_at: null,
          canceled_at: null,
          items: {
            data: [
              {
                id: "si_abc",
                quantity: 1,
                current_period_start: 1735689600,
                current_period_end: 1767225600,
                price: {
                  id: "price_abc",
                  unit_amount: 1999,
                  currency: "usd",
                  recurring: { interval: "month" },
                  product: "prod_abc",
                },
              },
            ],
          },
        } as any,
      ]);

      const result = await service.getUserDetail("bob@example.com");

      expect(mockPaidCustomerModel.findByUserId).toHaveBeenCalledWith(
        mockDb,
        "u1",
      );
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith("u1");
      expect(result.paidCustomers).toEqual([
        {
          clientId: "beancount-web-prod",
          stripeCustomerId: "cus_prod",
          email: "bob@example.com",
          name: "Bob Jones",
          phone: undefined,
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ]);
      expect(result.subscriptions).toEqual([
        {
          id: "sub_abc",
          clientId: "beancount-web-prod",
          status: "active",
          currentPeriodStart: new Date(1735689600 * 1000).toISOString(),
          currentPeriodEnd: new Date(1767225600 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          cancelAt: undefined,
          canceledAt: undefined,
          items: [
            {
              id: "si_abc",
              priceId: "price_abc",
              productId: "prod_abc",
              quantity: 1,
              unitAmount: 1999,
              currency: "usd",
              interval: "month",
            },
          ],
        },
      ]);
    });
  });

  describe("getUserLedgers", () => {
    it("should throw NotFoundError when user does not exist", async () => {
      mockUserModel.getByMail.mockResolvedValue(null);

      await expect(
        service.getUserLedgers("notfound@example.com"),
      ).rejects.toThrow(NotFoundError);
      expect(
        mockLedgerWorkflow.listUserOwnedLedgersWithDirectiveCounts,
      ).not.toHaveBeenCalled();
    });

    it("should look up the user then return their ledgers with directive counts", async () => {
      mockUserModel.getByMail.mockResolvedValue({
        id: "u1",
        email: "alice@example.com",
      } as any);
      mockLedgerWorkflow.listUserOwnedLedgersWithDirectiveCounts.mockResolvedValue(
        [
          {
            id: "alice/personal",
            name: "personal",
            fullName: "alice/personal",
            sshUrl: "git@gitea:alice/personal.git",
            httpUrl: "https://gitea/alice/personal.git",
            empty: false,
            private: true,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            size: 2048,
            directiveCount: 842,
          },
          {
            id: "alice/empty-ledger",
            name: "empty-ledger",
            fullName: "alice/empty-ledger",
            sshUrl: "git@gitea:alice/empty-ledger.git",
            httpUrl: "https://gitea/alice/empty-ledger.git",
            empty: true,
            private: false,
            createdAt: "2025-02-01T00:00:00.000Z",
            updatedAt: "2026-02-01T00:00:00.000Z",
            size: 0,
            directiveCount: 0,
          },
          {
            id: "alice/errored-ledger",
            name: "errored-ledger",
            fullName: "alice/errored-ledger",
            sshUrl: "git@gitea:alice/errored-ledger.git",
            httpUrl: "https://gitea/alice/errored-ledger.git",
            empty: false,
            private: false,
            createdAt: "2025-03-01T00:00:00.000Z",
            updatedAt: "2026-03-01T00:00:00.000Z",
            size: 128,
            directiveCount: null,
          },
        ],
      );

      const result = await service.getUserLedgers("alice@example.com");

      expect(mockUserModel.getByMail).toHaveBeenCalledWith(
        mockDb,
        "alice@example.com",
      );
      expect(
        mockLedgerWorkflow.listUserOwnedLedgersWithDirectiveCounts,
      ).toHaveBeenCalledWith({ userId: "u1" });
      expect(result.ledgers).toEqual([
        {
          id: "alice/personal",
          name: "personal",
          fullName: "alice/personal",
          private: true,
          empty: false,
          size: 2048,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          directiveCount: 842,
        },
        {
          id: "alice/empty-ledger",
          name: "empty-ledger",
          fullName: "alice/empty-ledger",
          private: false,
          empty: true,
          size: 0,
          createdAt: "2025-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
          directiveCount: 0,
        },
        {
          id: "alice/errored-ledger",
          name: "errored-ledger",
          fullName: "alice/errored-ledger",
          private: false,
          empty: false,
          size: 128,
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          directiveCount: null,
        },
      ]);
    });
  });

  describe("getLedgerDirectiveLimit", () => {
    it("throws NotFoundError for an unknown ledger username, even with a stray bypass entry present", async () => {
      mockUserModel.getUserByUsername.mockResolvedValue(null);
      mockCacheHelper.get.mockResolvedValue(true);

      await expect(service.getLedgerDirectiveLimit("ghost")).rejects.toThrow(
        NotFoundError,
      );
      expect(mockGetUserTierLimits).not.toHaveBeenCalled();
    });

    it("resolves via the tier lookup when no bypass ticket is present", async () => {
      mockUserModel.getUserByUsername.mockResolvedValue({
        id: "u1",
      } as never);
      mockCacheHelper.get.mockResolvedValue(undefined);
      mockGetUserTierLimits.mockResolvedValue(
        getTierLimits(SubscriptionTier.FREE),
      );

      const result = await service.getLedgerDirectiveLimit("alice");

      expect(result).toEqual({ maxDirectives: 1000 });
      expect(mockGetUserTierLimits).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1" }),
      );
    });

  });
});
