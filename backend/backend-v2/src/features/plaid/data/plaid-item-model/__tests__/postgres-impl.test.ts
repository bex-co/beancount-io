import { PlaidItemPostgresModel } from "../postgres-impl";
import type { CreatePlaidItemInput } from "../types";

// Mock the database
const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
} as any;

describe("PlaidItemPostgresModel", () => {
  let model: PlaidItemPostgresModel;

  beforeEach(() => {
    model = new PlaidItemPostgresModel();
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should generate a prefixed ID when creating a Plaid item", async () => {
      const input: CreatePlaidItemInput = {
        userId: "test-user-id",
        ledgerRepoId: 42,
        itemId: "plaid-item-external-id",
        accessToken: "access-token-123",
        institutionId: "ins_123",
        institutionName: "Test Bank",
      };

      const mockCreatedItem = {
        id: "pitm_3ZqE8yK9mXpN12345678",
        userId: input.userId,
        ledgerRepoId: 42,
        itemId: input.itemId,
        accessToken: input.accessToken,
        institutionId: input.institutionId,
        institutionName: input.institutionName,
        status: "active",
        errorCode: null,
        errorMessage: null,
        transactionsCursor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockCreatedItem]);

      const result = await model.create(mockDb, input);

      // Verify that values() was called with an ID
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          userId: input.userId,
          ledgerRepoId: 42,
          itemId: input.itemId,
          accessToken: input.accessToken,
          institutionId: input.institutionId,
          institutionName: input.institutionName,
          status: "active",
        }),
      );

      // Verify the generated ID has the correct prefix and format
      const generatedId = mockDb.values.mock.calls[0][0].id;
      expect(generatedId).toMatch(
        /^pitm_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20}$/,
      );

      // Verify the result
      expect(result).toEqual({
        id: mockCreatedItem.id,
        userId: mockCreatedItem.userId,
        ledgerRepoId: 42,
        itemId: mockCreatedItem.itemId,
        accessToken: mockCreatedItem.accessToken,
        institutionId: mockCreatedItem.institutionId,
        institutionName: mockCreatedItem.institutionName,
        status: "active",
        createdAt: mockCreatedItem.createdAt,
        updatedAt: mockCreatedItem.updatedAt,
      });
    });

    it("should persist ledgerRepoId on the created item", async () => {
      const input: CreatePlaidItemInput = {
        userId: "test-user-id",
        ledgerRepoId: 42,
        itemId: "plaid-item-external-id",
        accessToken: "access-token-123",
        institutionId: "ins_123",
        institutionName: "Test Bank",
      };

      const mockCreatedItem = {
        id: "pitm_3ZqE8yK9mXpN12345678",
        userId: input.userId,
        ledgerRepoId: 42,
        itemId: input.itemId,
        accessToken: input.accessToken,
        institutionId: input.institutionId,
        institutionName: input.institutionName,
        status: "active",
        errorCode: null,
        errorMessage: null,
        transactionsCursor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockCreatedItem]);

      const result = await model.create(mockDb, input);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerRepoId: 42 }),
      );
      expect(result.ledgerRepoId).toBe(42);
    });
  });

  describe("getByLedgerRepoId", () => {
    it("should query by ledgerRepoId and map results", async () => {
      const mockRow = {
        id: "pitm_3ZqE8yK9mXpN12345678",
        userId: "test-user-id",
        ledgerRepoId: 42,
        itemId: "plaid-item-external-id",
        accessToken: "access-token-123",
        institutionId: "ins_123",
        institutionName: "Test Bank",
        status: "active",
        errorCode: null,
        errorMessage: null,
        transactionsCursor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.where.mockResolvedValue([mockRow]);

      const result = await model.getByLedgerRepoId(mockDb, 42);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ ledgerRepoId: 42 })]);
    });

    it("should return an empty array when no items match", async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await model.getByLedgerRepoId(mockDb, 999);

      expect(result).toEqual([]);
    });
  });

  describe("deleteByLedgerRepoId", () => {
    it("should delete plaid_items rows for the given ledgerRepoId", async () => {
      mockDb.where.mockResolvedValue(undefined);

      await model.deleteByLedgerRepoId(mockDb, 42);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
