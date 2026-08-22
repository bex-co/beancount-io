import { FeatureUsagePostgresModel } from "../postgres-impl";

// Mock the database
const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
} as any;

describe("FeatureUsagePostgresModel", () => {
  let model: FeatureUsagePostgresModel;

  beforeEach(() => {
    model = new FeatureUsagePostgresModel();
    jest.clearAllMocks();
  });

  describe("addAndGetCount", () => {
    it("should insert a new record with the given token count on first usage", async () => {
      mockDb.returning.mockResolvedValue([{ usageCount: 500 }]);

      const result = await model.addAndGetCount(
        mockDb,
        "user-123",
        "ai_cfo",
        "2026-03",
        500,
      );

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          userId: "user-123",
          featureKey: "ai_cfo",
          billingMonth: "2026-03",
          usageCount: 500,
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1);
      expect(result).toBe(500);
    });

    it("should add tokens to existing record on conflict", async () => {
      mockDb.returning.mockResolvedValue([{ usageCount: 1500 }]);

      const result = await model.addAndGetCount(
        mockDb,
        "user-123",
        "ai_cfo",
        "2026-03",
        300,
      );

      expect(result).toBe(1500);
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should generate an ID with the ftusg_ prefix", async () => {
      mockDb.returning.mockResolvedValue([{ usageCount: 100 }]);

      await model.addAndGetCount(mockDb, "user-1", "ai_cfo", "2026-03", 100);

      const generatedId = mockDb.values.mock.calls[0][0].id;
      expect(generatedId).toMatch(/^ftusg_/);
    });

    it("should return the usageCount from the returned row", async () => {
      mockDb.returning.mockResolvedValue([{ usageCount: 42000 }]);

      const result = await model.addAndGetCount(
        mockDb,
        "user-abc",
        "ai_cfo",
        "2026-01",
        1000,
      );

      expect(result).toBe(42000);
    });
  });

  describe("getCount", () => {
    it("should return 0 when no record exists for user+feature+month", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await model.getCount(
        mockDb,
        "user-123",
        "ai_cfo",
        "2026-03",
      );

      expect(result).toBe(0);
    });

    it("should return the usage count when a record exists", async () => {
      mockDb.limit.mockResolvedValue([{ usageCount: 7000 }]);

      const result = await model.getCount(
        mockDb,
        "user-123",
        "ai_cfo",
        "2026-03",
      );

      expect(result).toBe(7000);
    });

    it("should query only for the specific user, feature, and billing month", async () => {
      mockDb.limit.mockResolvedValue([{ usageCount: 3000 }]);

      await model.getCount(mockDb, "user-456", "ai_cfo", "2025-12");

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.from).toHaveBeenCalledTimes(1);
      expect(mockDb.where).toHaveBeenCalledTimes(1);
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it("should return 0 when the result row has a null usageCount", async () => {
      mockDb.limit.mockResolvedValue([{ usageCount: null }]);

      const result = await model.getCount(
        mockDb,
        "user-123",
        "ai_cfo",
        "2026-03",
      );

      expect(result).toBe(0);
    });
  });
});
