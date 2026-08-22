import { AiCfoUsageService, FEATURE_KEY_AI_CFO } from "../ai-cfo-usage-service";
import type { IFeatureUsageService } from "../feature-usage-service";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Mock the cross-service tier operation; the pure getTierLimits runs for real.
jest.mock("@/features/stripe/operations/get-user-tier");

const mockGetUserTier = getUserTier as jest.Mock;

// Real tier-limit token caps (from TIER_LIMITS)
const FREE_TOKENS = 20_000;
const PREMIUM_TOKENS = 500_000;

describe("AiCfoUsageService", () => {
  let service: AiCfoUsageService;
  // Typed against the INTERFACE: no `as unknown as` cast, and every
  // `mockResolvedValue` below is checked against the real method signatures.
  let mockFeatureUsageService: jest.Mocked<IFeatureUsageService>;
  // Only paidCustomer is forwarded to getUserTier (mocked), never read here.
  const mockModels = {} as Pick<IModels, "paidCustomer">;
  const mockPostgresDb = {} as NodePgDatabase;
  // stripe is forwarded to getUserTier (mocked) and never called here.
  const mockStripe = {} as jest.Mocked<IStripeService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFeatureUsageService = {
      checkUsage: jest.fn(),
      addTokenUsage: jest.fn(),
      getUsage: jest.fn(),
      getCurrentBillingMonth: jest.fn(),
    };

    service = new AiCfoUsageService(
      mockFeatureUsageService,
      mockStripe,
      mockModels,
      mockPostgresDb,
    );
  });

  describe("FEATURE_KEY_AI_CFO", () => {
    it("should equal ai_cfo", () => {
      expect(FEATURE_KEY_AI_CFO).toBe("ai_cfo");
    });
  });

  describe("check", () => {
    it("should resolve user tier and delegate to FeatureUsageService.checkUsage", async () => {
      mockGetUserTier.mockResolvedValue(SubscriptionTier.FREE);
      mockFeatureUsageService.checkUsage.mockResolvedValue({
        allowed: true,
        currentCount: 1000,
        maxAllowed: FREE_TOKENS,
        billingMonth: "2025-01",
      });

      const result = await service.check("user1");

      expect(mockGetUserTier).toHaveBeenCalledWith({
        stripe: mockStripe,
        models: mockModels,
        postgresDb: mockPostgresDb,
        userId: "user1",
      });
      expect(mockFeatureUsageService.checkUsage).toHaveBeenCalledWith(
        "user1",
        FEATURE_KEY_AI_CFO,
        FREE_TOKENS,
      );
      expect(result.allowed).toBe(true);
    });

    it("should return denied result when token limit is exceeded", async () => {
      mockGetUserTier.mockResolvedValue(SubscriptionTier.FREE);
      mockFeatureUsageService.checkUsage.mockResolvedValue({
        allowed: false,
        currentCount: FREE_TOKENS,
        maxAllowed: FREE_TOKENS,
        billingMonth: "2025-01",
      });

      const result = await service.check("user1");

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(FREE_TOKENS);
      expect(result.maxAllowed).toBe(FREE_TOKENS);
    });

    it("should use PREMIUM tier limits when user is PREMIUM", async () => {
      mockGetUserTier.mockResolvedValue(SubscriptionTier.PREMIUM);
      mockFeatureUsageService.checkUsage.mockResolvedValue({
        allowed: true,
        currentCount: 0,
        maxAllowed: PREMIUM_TOKENS,
        billingMonth: "2025-01",
      });

      await service.check("user1");

      expect(mockFeatureUsageService.checkUsage).toHaveBeenCalledWith(
        "user1",
        FEATURE_KEY_AI_CFO,
        PREMIUM_TOKENS,
      );
    });
  });

  describe("addTokenUsage", () => {
    it("should delegate to FeatureUsageService.addTokenUsage with the correct key", async () => {
      mockFeatureUsageService.addTokenUsage.mockResolvedValue(5000);

      await service.addTokenUsage("user1", 2500);

      expect(mockFeatureUsageService.addTokenUsage).toHaveBeenCalledWith(
        "user1",
        FEATURE_KEY_AI_CFO,
        2500,
      );
    });
  });

  describe("getUsage", () => {
    it("should return usage info with tier and tier limits", async () => {
      mockGetUserTier.mockResolvedValue(SubscriptionTier.FREE);
      mockFeatureUsageService.getUsage.mockResolvedValue({
        currentCount: 3000,
        billingMonth: "2025-01",
      });

      const result = await service.getUsage("user1");

      expect(result.currentCount).toBe(3000);
      expect(result.maxAllowed).toBe(FREE_TOKENS);
      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.billingMonth).toBe("2025-01");
    });

    it("should call getUsage with correct feature key", async () => {
      mockGetUserTier.mockResolvedValue(SubscriptionTier.FREE);
      mockFeatureUsageService.getUsage.mockResolvedValue({
        currentCount: 0,
        billingMonth: "2025-01",
      });

      await service.getUsage("user123");

      expect(mockFeatureUsageService.getUsage).toHaveBeenCalledWith(
        "user123",
        FEATURE_KEY_AI_CFO,
      );
    });
  });
});
