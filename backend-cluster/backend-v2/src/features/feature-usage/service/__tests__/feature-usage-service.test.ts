import { FeatureUsageService } from "../feature-usage-service";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

describe("FeatureUsageService", () => {
  let service: FeatureUsageService;
  let mockModels: jest.Mocked<Pick<IModels, "featureUsage">>;
  let mockPostgresDb: jest.Mocked<NodePgDatabase>;

  beforeEach(() => {
    mockModels = {
      featureUsage: {
        addAndGetCount: jest.fn(),
        reserveAndGetCount: jest.fn(),
        releaseCount: jest.fn(),
        getCount: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<IModels, "featureUsage">>;

    mockPostgresDb = {} as jest.Mocked<NodePgDatabase>;

    service = new FeatureUsageService(mockModels, mockPostgresDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCurrentBillingMonth", () => {
    it("should return a string in YYYY-MM format", () => {
      const result = service.getCurrentBillingMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should return the current UTC year and month", () => {
      const now = new Date();
      const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      expect(service.getCurrentBillingMonth()).toBe(expected);
    });
  });

  describe("checkUsage", () => {
    it("should always allow when maxAllowed is -1 (unlimited)", async () => {
      const result = await service.checkUsage("user1", "ai_cfo", -1);

      expect(result.allowed).toBe(true);
      expect(result.maxAllowed).toBe(-1);
      expect(mockModels.featureUsage.getCount).not.toHaveBeenCalled();
      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });

    it("should deny when currentCount >= maxAllowed", async () => {
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(50_000);

      const result = await service.checkUsage("user1", "ai_cfo", 50_000);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(50_000);
      expect(result.maxAllowed).toBe(50_000);
      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });

    it("should allow when currentCount < maxAllowed", async () => {
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(3_000);

      const result = await service.checkUsage("user1", "ai_cfo", 50_000);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(3_000);
      expect(result.maxAllowed).toBe(50_000);
      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });

    it("should return billingMonth in the result", async () => {
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(0);

      const result = await service.checkUsage("user1", "ai_cfo", 50_000);

      expect(result.billingMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should pass correct arguments to getCount", async () => {
      const userId = "user123";
      const featureKey = "ai_cfo";
      const billingMonth = service.getCurrentBillingMonth();

      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(0);

      await service.checkUsage(userId, featureKey, 50_000);

      expect(mockModels.featureUsage.getCount).toHaveBeenCalledWith(
        mockPostgresDb,
        userId,
        featureKey,
        billingMonth,
      );
    });
  });

  describe("addTokenUsage", () => {
    it("should call addAndGetCount with the correct token count", async () => {
      const userId = "user123";
      const featureKey = "ai_cfo";
      const billingMonth = service.getCurrentBillingMonth();
      (mockModels.featureUsage.addAndGetCount as jest.Mock).mockResolvedValue(
        5_000,
      );

      await service.addTokenUsage(userId, featureKey, 2_000);

      expect(mockModels.featureUsage.addAndGetCount).toHaveBeenCalledWith(
        mockPostgresDb,
        userId,
        featureKey,
        billingMonth,
        2_000,
      );
    });

    it("should skip the DB call when tokensToAdd is 0", async () => {
      await service.addTokenUsage("user1", "ai_cfo", 0);

      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });
  });

  describe("reserveUsage", () => {
    it("holds the rounded-up tokens through the conditional add", async () => {
      (
        mockModels.featureUsage.reserveAndGetCount as jest.Mock
      ).mockResolvedValue(4_001);

      const result = await service.reserveUsage(
        "user1",
        "ai_cfo",
        20_000,
        4_000.2,
      );

      expect(mockModels.featureUsage.reserveAndGetCount).toHaveBeenCalledWith(
        mockPostgresDb,
        "user1",
        "ai_cfo",
        service.getCurrentBillingMonth(),
        4_001,
        20_000,
      );
      expect(result).toEqual({
        allowed: true,
        currentCount: 4_001,
        maxAllowed: 20_000,
        billingMonth: service.getCurrentBillingMonth(),
        reservedTokens: 4_001,
      });
    });

    it("refuses with the current count and holds nothing once the limit is reached", async () => {
      (
        mockModels.featureUsage.reserveAndGetCount as jest.Mock
      ).mockResolvedValue(null);
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(21_500);

      const result = await service.reserveUsage("user1", "ai_cfo", 20_000, 500);

      expect(result).toMatchObject({
        allowed: false,
        currentCount: 21_500,
        maxAllowed: 20_000,
        reservedTokens: 0,
      });
    });

    it("admits an unlimited plan without holding or writing anything", async () => {
      const result = await service.reserveUsage("user1", "ai_cfo", -1, 500);

      expect(result).toMatchObject({ allowed: true, reservedTokens: 0 });
      expect(mockModels.featureUsage.reserveAndGetCount).not.toHaveBeenCalled();
    });

    it("refuses a zero limit without writing a row", async () => {
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(0);

      const result = await service.reserveUsage("user1", "ai_cfo", 0, 500);

      expect(result.allowed).toBe(false);
      expect(mockModels.featureUsage.reserveAndGetCount).not.toHaveBeenCalled();
    });
  });

  describe("settleUsage", () => {
    const reservation = { billingMonth: "2026-10", reservedTokens: 1_000 };

    it("adds what the work used beyond its reservation, in the reservation's month", async () => {
      await service.settleUsage("user1", "ai_cfo", reservation, 1_250);

      expect(mockModels.featureUsage.addAndGetCount).toHaveBeenCalledWith(
        mockPostgresDb,
        "user1",
        "ai_cfo",
        "2026-10",
        250,
      );
      expect(mockModels.featureUsage.releaseCount).not.toHaveBeenCalled();
    });

    it("releases the part of the reservation the work did not use", async () => {
      await service.settleUsage("user1", "ai_cfo", reservation, 400);

      expect(mockModels.featureUsage.releaseCount).toHaveBeenCalledWith(
        mockPostgresDb,
        "user1",
        "ai_cfo",
        "2026-10",
        600,
      );
      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });

    it("releases the whole reservation when the work failed", async () => {
      await service.settleUsage("user1", "ai_cfo", reservation, 0);

      expect(mockModels.featureUsage.releaseCount).toHaveBeenCalledWith(
        mockPostgresDb,
        "user1",
        "ai_cfo",
        "2026-10",
        1_000,
      );
    });

    it("writes nothing when the work used exactly its reservation", async () => {
      await service.settleUsage("user1", "ai_cfo", reservation, 1_000);

      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
      expect(mockModels.featureUsage.releaseCount).not.toHaveBeenCalled();
    });

    it("records the full usage of an unlimited plan, which held nothing", async () => {
      await service.settleUsage(
        "user1",
        "ai_cfo",
        { billingMonth: "2026-10", reservedTokens: 0 },
        900,
      );

      expect(mockModels.featureUsage.addAndGetCount).toHaveBeenCalledWith(
        mockPostgresDb,
        "user1",
        "ai_cfo",
        "2026-10",
        900,
      );
    });
  });

  describe("getUsage", () => {
    it("should return currentCount and billingMonth without adding tokens", async () => {
      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(7_000);

      const result = await service.getUsage("user1", "ai_cfo");

      expect(result.currentCount).toBe(7_000);
      expect(result.billingMonth).toMatch(/^\d{4}-\d{2}$/);
      expect(mockModels.featureUsage.addAndGetCount).not.toHaveBeenCalled();
    });

    it("should pass correct arguments to getCount", async () => {
      const userId = "user123";
      const featureKey = "ai_cfo";
      const billingMonth = service.getCurrentBillingMonth();

      (mockModels.featureUsage.getCount as jest.Mock).mockResolvedValue(0);

      await service.getUsage(userId, featureKey);

      expect(mockModels.featureUsage.getCount).toHaveBeenCalledWith(
        mockPostgresDb,
        userId,
        featureKey,
        billingMonth,
      );
    });
  });
});
