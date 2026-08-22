import { createPlaidWebhookProcessorJob } from "../plaid-webhook-processor-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { PlaidWebhookEvent } from "@/features/plaid/data/plaid-webhook-event-model/types";

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

const mockGetPendingEvents = jest.fn();
const mockMarkAsProcessing = jest.fn();
const mockMarkAsCompleted = jest.fn();
const mockMarkAsFailed = jest.fn();

jest.mock("@/features/plaid/data/plaid-webhook-event-model", () => ({
  PlaidWebhookEventPostgresModel: jest.fn().mockImplementation(() => ({
    getPendingEvents: mockGetPendingEvents,
    markAsProcessing: mockMarkAsProcessing,
    markAsCompleted: mockMarkAsCompleted,
    markAsFailed: mockMarkAsFailed,
  })),
}));

const mockHandleEvent = jest.fn();
jest.mock("@/features/plaid/service/plaid-webhook-service", () => ({
  PlaidWebhookService: jest.fn().mockImplementation(() => ({
    handleEvent: mockHandleEvent,
  })),
}));

function buildEvent(
  overrides: Partial<PlaidWebhookEvent> = {},
): PlaidWebhookEvent {
  return {
    id: "pwe_test1",
    webhookType: "TRANSACTIONS",
    webhookCode: "SYNC_UPDATES_AVAILABLE",
    itemId: "item_abc",
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    rawBody: "{}",
    receivedAt: new Date(),
    processedAt: null,
    nextRetryAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PlaidWebhookEvent;
}

function createMockLayers(): AppLayers {
  return {
    database: { db: {} as any, models: {} as any },
    clients: { plaidClient: {} as any, favaClientFactory: {} as any },
    services: {},
    workflows: {},
  } as unknown as AppLayers;
}

describe("createPlaidWebhookProcessorJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLayers = createMockLayers();
    mockConfig = { env: "development" } as AppConfig;

    mockMarkAsProcessing.mockResolvedValue(undefined);
    mockMarkAsCompleted.mockResolvedValue(undefined);
    mockMarkAsFailed.mockResolvedValue(undefined);
    mockHandleEvent.mockResolvedValue(undefined);
  });

  it("should create a job with the correct schedule (every 2 minutes)", () => {
    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    expect(job.schedule).toBe("*/2 * * * *");
    expect(job.task).toBeInstanceOf(Function);
  });

  it("should do nothing when there are no pending events", async () => {
    mockGetPendingEvents.mockResolvedValue([]);

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    expect(mockMarkAsProcessing).not.toHaveBeenCalled();
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should process a single pending event successfully", async () => {
    const event = buildEvent();
    mockGetPendingEvents.mockResolvedValue([event]);

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    expect(mockMarkAsProcessing).toHaveBeenCalledWith(
      mockLayers.database.db,
      event.id,
    );
    expect(mockHandleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_type: event.webhookType,
        webhook_code: event.webhookCode,
        item_id: event.itemId,
        rawBody: event.rawBody,
      }),
    );
    expect(mockMarkAsCompleted).toHaveBeenCalledWith(
      mockLayers.database.db,
      event.id,
    );
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
  });

  it("should mark an event as failed when handleEvent throws", async () => {
    const event = buildEvent({ id: "pwe_fail1" });
    mockGetPendingEvents.mockResolvedValue([event]);
    mockHandleEvent.mockRejectedValue(new Error("Processing error"));

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task(); // Should NOT throw

    expect(mockMarkAsFailed).toHaveBeenCalledWith(
      mockLayers.database.db,
      event.id,
      expect.any(Error),
    );
    expect(mockMarkAsCompleted).not.toHaveBeenCalled();
  });

  it("should continue processing subsequent events after one fails", async () => {
    const event1 = buildEvent({ id: "pwe_1" });
    const event2 = buildEvent({ id: "pwe_2" });
    mockGetPendingEvents.mockResolvedValue([event1, event2]);

    // First event fails, second succeeds
    mockHandleEvent
      .mockRejectedValueOnce(new Error("First event error"))
      .mockResolvedValueOnce(undefined);

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    // Both events should be attempted
    expect(mockMarkAsProcessing).toHaveBeenCalledTimes(2);
    expect(mockHandleEvent).toHaveBeenCalledTimes(2);

    // First failed, second completed
    expect(mockMarkAsFailed).toHaveBeenCalledWith(
      mockLayers.database.db,
      event1.id,
      expect.any(Error),
    );
    expect(mockMarkAsCompleted).toHaveBeenCalledWith(
      mockLayers.database.db,
      event2.id,
    );
  });

  it("should process multiple events successfully", async () => {
    const events = [
      buildEvent({ id: "pwe_a" }),
      buildEvent({ id: "pwe_b" }),
      buildEvent({ id: "pwe_c" }),
    ];
    mockGetPendingEvents.mockResolvedValue(events);

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    expect(mockMarkAsProcessing).toHaveBeenCalledTimes(3);
    expect(mockHandleEvent).toHaveBeenCalledTimes(3);
    expect(mockMarkAsCompleted).toHaveBeenCalledTimes(3);
    expect(mockMarkAsFailed).not.toHaveBeenCalled();
  });

  it("should request up to 50 pending events per run", async () => {
    mockGetPendingEvents.mockResolvedValue([]);

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    expect(mockGetPendingEvents).toHaveBeenCalledWith(
      mockLayers.database.db,
      50,
    );
  });

  it("should log info-level summary when there are failures", async () => {
    const event = buildEvent({ id: "pwe_fail" });
    mockGetPendingEvents.mockResolvedValue([event]);
    mockHandleEvent.mockRejectedValue(new Error("fail"));
    const { logger } = jest.requireMock("@/shared/logger") as {
      logger: { info: jest.Mock };
    };

    const job = createPlaidWebhookProcessorJob(mockLayers, mockConfig);
    await job.task();

    expect(logger.info).toHaveBeenCalledWith(
      "Webhook processing batch completed with failures",
      expect.objectContaining({ failureCount: 1 }),
    );
  });
});
