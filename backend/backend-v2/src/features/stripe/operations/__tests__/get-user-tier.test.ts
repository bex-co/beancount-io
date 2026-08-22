import { getUserTier, getUserTierLimits } from "../get-user-tier";
import {
  SubscriptionTier,
  TIER_LIMITS,
  getTierLimits,
} from "../../service/stripe";
import { logger } from "@/shared/logger";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Mock logger
jest.mock("@/shared/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// StripeService is injected into the operation (not constructed); pass a stub.
let mockStripeService: {
  listSubscriptions: jest.Mock;
};

describe("get-user-tier operation", () => {
  let mockPaidCustomerModel: {
    findByUserIdWithActivePeriod: jest.Mock;
    findByUserId: jest.Mock;
  };
  let mockModels: Pick<IModels, "paidCustomer">;
  let mockPostgresDb: NodePgDatabase;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaidCustomerModel = {
      findByUserIdWithActivePeriod: jest.fn(),
      findByUserId: jest.fn(),
    };

    mockModels = {
      paidCustomer: mockPaidCustomerModel,
    } as unknown as Pick<IModels, "paidCustomer">;

    mockPostgresDb = {} as NodePgDatabase;

    mockStripeService = {
      listSubscriptions: jest.fn(),
    };
  });

  describe("getUserTier", () => {
    it("should return PREMIUM when user has active paidCustomer subscription", async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue({
        userId: "user-123",
        currentPeriodEnd: futureDate,
        clientId: "beancount-web-prod",
      });

      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          status: "active",
          clientId: "beancount-web-prod",
          items: {
            data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
          },
        },
      ]);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.PREMIUM);
      expect(
        mockPaidCustomerModel.findByUserIdWithActivePeriod,
      ).toHaveBeenCalledWith(expect.any(Object), "user-123");
    });

    it("should fallback to Stripe API when paidCustomer subscription is expired", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockPaidCustomerModel.findByUserId.mockResolvedValue([
        { clientId: "beancount-web-prod" },
      ]);
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          status: "active",
          clientId: "beancount-web-prod",
          items: {
            data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
          },
        },
      ]);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.PREMIUM);
      expect(
        mockPaidCustomerModel.findByUserIdWithActivePeriod,
      ).toHaveBeenCalled();
      expect(mockStripeService.listSubscriptions).toHaveBeenCalledWith(
        "user-123",
      );
    });

    it("should return PREMIUM when Stripe API shows active subscription", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockPaidCustomerModel.findByUserId.mockResolvedValue([
        { clientId: "beancount-web-prod" },
      ]);
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          status: "active",
          clientId: "beancount-web-prod",
          items: {
            data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
          },
        },
        { status: "canceled" },
      ]);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.PREMIUM);
    });

    it("should return FREE when no active subscriptions exist", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockStripeService.listSubscriptions.mockResolvedValue([
        { status: "canceled" },
        { status: "past_due" },
      ]);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.FREE);
    });

    it("should return FREE when user has no subscriptions at all", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockStripeService.listSubscriptions.mockResolvedValue([]);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.FREE);
    });

    it("should return FREE and log error when paidCustomer lookup fails", async () => {
      const error = new Error("Database connection failed");
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockRejectedValue(
        error,
      );

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.FREE);
      expect(logger.error).toHaveBeenCalledWith("Error determining user tier", {
        userId: "user-123",
        errorType: "Error",
        errorMessage: "Database connection failed",
        stack: expect.any(String),
      });
    });

    it("should return FREE and log error when Stripe API fails", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      const error = new Error("Stripe API error");
      mockStripeService.listSubscriptions.mockRejectedValue(error);

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.FREE);
      expect(logger.error).toHaveBeenCalledWith("Error determining user tier", {
        userId: "user-123",
        errorType: "Error",
        errorMessage: "Stripe API error",
        stack: expect.any(String),
      });
    });

    it("should handle non-Error exceptions", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockRejectedValue(
        "String error",
      );

      const tier = await getUserTier({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(tier).toBe(SubscriptionTier.FREE);
      expect(logger.error).toHaveBeenCalledWith("Error determining user tier", {
        userId: "user-123",
        errorType: "string",
        errorMessage: "String error",
        stack: undefined,
      });
    });
  });

  describe("getTierLimits (pure)", () => {
    it("should return correct limits for FREE tier", () => {
      const limits = getTierLimits(SubscriptionTier.FREE);
      expect(limits).toEqual({
        maxLedgers: 1,
        maxCollaboratorsPerLedger: 1,
        aiCfoTokensMax: 20_000,
        maxDirectives: 1000,
      });
      expect(limits).toBe(TIER_LIMITS[SubscriptionTier.FREE]);
    });

    it("should return correct limits for PREMIUM tier", () => {
      const limits = getTierLimits(SubscriptionTier.PREMIUM);
      expect(limits).toEqual({
        maxLedgers: 5,
        maxCollaboratorsPerLedger: 5,
        aiCfoTokensMax: 500_000,
        maxDirectives: -1,
      });
      expect(limits).toBe(TIER_LIMITS[SubscriptionTier.PREMIUM]);
    });
  });

  describe("getUserTierLimits", () => {
    it("should return FREE tier limits when user has no subscription", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue(
        null,
      );
      mockStripeService.listSubscriptions.mockResolvedValue([]);

      const limits = await getUserTierLimits({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(limits).toEqual({
        maxLedgers: 1,
        maxCollaboratorsPerLedger: 1,
        aiCfoTokensMax: 20_000,
        maxDirectives: 1000,
      });
    });

    it("should return PREMIUM tier limits when user has active subscription", async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockResolvedValue({
        userId: "user-123",
        currentPeriodEnd: futureDate,
        clientId: "beancount-web-prod",
      });
      mockStripeService.listSubscriptions.mockResolvedValue([
        {
          status: "active",
          clientId: "beancount-web-prod",
          items: {
            data: [{ price: { id: "price_1RrSOGEqsEqs2tLVFnyB34qG" } }],
          },
        },
      ]);

      const limits = await getUserTierLimits({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(limits).toEqual({
        maxLedgers: 5,
        maxCollaboratorsPerLedger: 5,
        aiCfoTokensMax: 500_000,
        maxDirectives: -1,
      });
    });

    it("should handle errors and return FREE tier limits", async () => {
      mockPaidCustomerModel.findByUserIdWithActivePeriod.mockRejectedValue(
        new Error("Database error"),
      );

      const limits = await getUserTierLimits({
        stripe: mockStripeService as any,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user-123",
      });

      expect(limits).toEqual({
        maxLedgers: 1,
        maxCollaboratorsPerLedger: 1,
        aiCfoTokensMax: 20_000,
        maxDirectives: 1000,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
