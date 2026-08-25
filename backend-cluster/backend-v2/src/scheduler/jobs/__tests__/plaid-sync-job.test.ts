import { createPlaidSyncJob } from "../plaid-sync-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { PlaidItem } from "@/features/plaid/data/plaid-item-model/types";

// Mock logger
jest.mock("@/shared/logger", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };
  mockLogger.child.mockReturnValue(mockLogger);
  return { logger: mockLogger };
});

const mockGetActiveItems = jest.fn();
jest.mock("@/features/plaid/data/plaid-item-model", () => ({
  PlaidItemPostgresModel: jest.fn().mockImplementation(() => ({
    getActiveItems: mockGetActiveItems,
  })),
}));

const mockSyncItemTransactions = jest.fn();
jest.mock("@/features/plaid/service/plaid-sync-service", () => ({
  PlaidSyncService: jest.fn().mockImplementation(() => ({
    syncItemTransactions: mockSyncItemTransactions,
  })),
}));

function buildItem(overrides: Partial<PlaidItem> = {}): PlaidItem {
  return {
    id: "item_test1",
    userId: "user_abc",
    itemId: "plaid_item_abc",
    accessToken: "enc_token",
    institutionId: "ins_1",
    institutionName: "Test Bank",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PlaidItem;
}

function createMockLayers(): AppLayers {
  return {
    database: { db: {} as any, models: {} as any },
    clients: { plaidClient: {} as any, favaClientFactory: {} as any },
    services: {},
    workflows: {},
  } as unknown as AppLayers;
}

describe("createPlaidSyncJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLayers = createMockLayers();
    mockConfig = {
      env: "development",
      blockeden: { accessKey: "test-key" },
    } as unknown as AppConfig;

    // Default: no active items (avoids cross-test leakage of mockResolvedValueOnce queues)
    mockGetActiveItems.mockResolvedValue([]);
    mockSyncItemTransactions.mockResolvedValue({
      success: true,
      transactionsFetched: 0,
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
    });
  });

  it("should create a job with the correct schedule (every 6 hours)", () => {
    const job = createPlaidSyncJob(mockLayers, mockConfig);
    expect(job.schedule).toBe("0 */6 * * *");
    expect(job.task).toBeInstanceOf(Function);
  });

  it("should do nothing when there are no active items", async () => {
    mockGetActiveItems.mockResolvedValue([]);

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task();

    expect(mockSyncItemTransactions).not.toHaveBeenCalled();
  });

  it("should sync a single active item successfully", async () => {
    const item = buildItem();
    // Only one batch call needed: 1 item < 50 → loop breaks immediately
    mockGetActiveItems.mockResolvedValueOnce([item]);

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task();

    expect(mockSyncItemTransactions).toHaveBeenCalledWith(
      // A scheduled run has no caller, so it claims a system identity on the
      // user's behalf — named at the call site rather than defaulted inside
      // the service (w3/m9).
      expect.objectContaining({
        userId: item.userId,
        capabilityExempt: true,
      }),
      item.id,
      "scheduled",
    );
  });

  it("should continue syncing remaining items when one item fails", async () => {
    const item1 = buildItem({ id: "item_1", userId: "user_1" });
    const item2 = buildItem({ id: "item_2", userId: "user_2" });

    // 2 items < 50 → loop breaks after first batch call
    mockGetActiveItems.mockResolvedValueOnce([item1, item2]);

    mockSyncItemTransactions
      .mockRejectedValueOnce(new Error("Sync error"))
      .mockResolvedValueOnce({ success: true });

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task(); // Should NOT throw

    expect(mockSyncItemTransactions).toHaveBeenCalledTimes(2);
  });

  it("should process items in batches using offset pagination", async () => {
    // Simulate exactly 50 items in first batch (full batch), then empty second batch
    const firstBatch = Array.from({ length: 50 }, (_, i) =>
      buildItem({ id: `item_${i}`, userId: `user_${i}` }),
    );

    mockGetActiveItems
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce([]);

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task();

    // First call: offset=0, limit=50
    expect(mockGetActiveItems).toHaveBeenNthCalledWith(
      1,
      mockLayers.database.db,
      50,
      0,
    );
    // Second call: offset=50, limit=50
    expect(mockGetActiveItems).toHaveBeenNthCalledWith(
      2,
      mockLayers.database.db,
      50,
      50,
    );

    expect(mockSyncItemTransactions).toHaveBeenCalledTimes(50);
  });

  it("should stop after a partial batch (fewer than 50 items)", async () => {
    const items = [buildItem({ id: "item_x" }), buildItem({ id: "item_y" })];
    // Only one batch with 2 items - should NOT fetch a second page
    mockGetActiveItems.mockResolvedValueOnce(items);

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task();

    expect(mockGetActiveItems).toHaveBeenCalledTimes(1);
    expect(mockSyncItemTransactions).toHaveBeenCalledTimes(2);
  });

  it("should log errors for failed item syncs without aborting", async () => {
    const item = buildItem({ id: "item_bad" });
    // 1 item < 50 → loop breaks after first batch call
    mockGetActiveItems.mockResolvedValueOnce([item]);
    mockSyncItemTransactions.mockRejectedValue(new Error("Plaid API error"));
    const { logger } = jest.requireMock("@/shared/logger") as {
      logger: { error: jest.Mock };
    };

    const job = createPlaidSyncJob(mockLayers, mockConfig);
    await job.task();

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to sync Item in scheduled job",
      expect.objectContaining({ itemId: item.id, userId: item.userId }),
    );
  });
});
