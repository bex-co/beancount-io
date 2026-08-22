import { createPlaidWebhookCleanupJob } from "../plaid-webhook-cleanup-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

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

// Mock PlaidWebhookEventPostgresModel
const mockDeleteCompletedEvents = jest.fn();
jest.mock("@/features/plaid/data/plaid-webhook-event-model", () => ({
  PlaidWebhookEventPostgresModel: jest.fn().mockImplementation(() => ({
    deleteCompletedEvents: mockDeleteCompletedEvents,
  })),
}));

function createMockLayers(): AppLayers {
  return {
    database: { db: {} as any, models: {} as any },
    clients: {},
    services: {},
    workflows: {},
  } as unknown as AppLayers;
}

describe("createPlaidWebhookCleanupJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLayers = createMockLayers();
    mockConfig = { env: "development" } as AppConfig;
    mockDeleteCompletedEvents.mockResolvedValue(0);
  });

  it("should create a job with the correct schedule (daily at 2 AM)", () => {
    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);
    expect(job.schedule).toBe("0 2 * * *");
    expect(job.task).toBeInstanceOf(Function);
  });

  it("should call deleteCompletedEvents with a cutoff date 3 days in the past", async () => {
    const before = new Date();

    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);
    await job.task();

    const after = new Date();

    expect(mockDeleteCompletedEvents).toHaveBeenCalledTimes(1);

    const [_db, cutoffDate] = mockDeleteCompletedEvents.mock.calls[0] as [
      unknown,
      Date,
    ];

    // Cutoff date should be approximately 3 days before now
    const expectedStart = new Date(before);
    expectedStart.setDate(expectedStart.getDate() - 3);

    const expectedEnd = new Date(after);
    expectedEnd.setDate(expectedEnd.getDate() - 3);

    expect(cutoffDate.getTime()).toBeGreaterThanOrEqual(
      expectedStart.getTime() - 1000,
    );
    expect(cutoffDate.getTime()).toBeLessThanOrEqual(
      expectedEnd.getTime() + 1000,
    );
  });

  it("should pass the service's postgresDb to deleteCompletedEvents", async () => {
    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);
    await job.task();

    expect(mockDeleteCompletedEvents).toHaveBeenCalledWith(
      mockLayers.database.db,
      expect.any(Date),
    );
  });

  it("should log the number of deleted events", async () => {
    mockDeleteCompletedEvents.mockResolvedValue(42);
    const { logger } = jest.requireMock("@/shared/logger") as {
      logger: { debug: jest.Mock; child: jest.Mock };
    };

    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);
    await job.task();

    // Verify the job logged the completed cleanup
    expect(logger.debug).toHaveBeenCalledWith(
      "Webhook cleanup completed",
      expect.objectContaining({ deletedCount: 42 }),
    );
  });

  it("should log zero deleted events when no events qualify", async () => {
    mockDeleteCompletedEvents.mockResolvedValue(0);
    const { logger } = jest.requireMock("@/shared/logger") as {
      logger: { debug: jest.Mock; child: jest.Mock };
    };

    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);
    await job.task();

    expect(logger.debug).toHaveBeenCalledWith(
      "Webhook cleanup completed",
      expect.objectContaining({ deletedCount: 0 }),
    );
  });

  it("should propagate errors thrown by deleteCompletedEvents", async () => {
    mockDeleteCompletedEvents.mockRejectedValue(new Error("DB unavailable"));

    const job = createPlaidWebhookCleanupJob(mockLayers, mockConfig);

    await expect(job.task()).rejects.toThrow("DB unavailable");
  });
});
