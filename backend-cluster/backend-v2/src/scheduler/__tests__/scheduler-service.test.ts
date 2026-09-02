import { JobScheduler } from "../job-scheduler";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { IJwtModel } from "@/features/auth/data/jwt-model/types";

// Mock node-cron
jest.mock("node-cron", () => ({
  schedule: jest.fn((_schedule, _task) => ({
    stop: jest.fn(),
  })),
}));

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

// Mock job creators
jest.mock("../jobs/jwt-cleanup-job", () => ({
  createJwtCleanupJob: jest.fn((_service, _config) => ({
    schedule: "0 0 * * *",
    task: jest.fn(),
  })),
}));

jest.mock("../jobs/dev-test-job", () => ({
  createDevTestJob: jest.fn((_service, _config) => ({
    schedule: "*/5 * * * *",
    task: jest.fn(),
  })),
}));

jest.mock("../jobs/plaid-sync-job", () => ({
  createPlaidSyncJob: jest.fn((_service, _config) => ({
    schedule: "0 */6 * * *",
    task: jest.fn(),
  })),
}));

jest.mock("../jobs/plaid-webhook-processor-job", () => ({
  createPlaidWebhookProcessorJob: jest.fn((_service, _config) => ({
    schedule: "*/2 * * * *",
    task: jest.fn(),
  })),
}));

jest.mock("../jobs/plaid-webhook-cleanup-job", () => ({
  createPlaidWebhookCleanupJob: jest.fn((_service, _config) => ({
    schedule: "0 2 * * *",
    task: jest.fn(),
  })),
}));

jest.mock("../jobs/oauth-adapter-cleanup-job", () => ({
  createOauthAdapterCleanupJob: jest.fn((_service, _config) => ({
    schedule: "0 0 * * *",
    task: jest.fn(),
  })),
}));

import cron from "node-cron";
import { logger } from "@/shared/logger";
import { createJwtCleanupJob } from "../jobs/jwt-cleanup-job";
import { createDevTestJob } from "../jobs/dev-test-job";
import { createPlaidSyncJob } from "../jobs/plaid-sync-job";
import { createPlaidWebhookProcessorJob } from "../jobs/plaid-webhook-processor-job";
import { createPlaidWebhookCleanupJob } from "../jobs/plaid-webhook-cleanup-job";
import { createOauthAdapterCleanupJob } from "../jobs/oauth-adapter-cleanup-job";

describe("JobScheduler", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;
  let scheduler: JobScheduler;
  let mockJwtModel: IJwtModel;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJwtModel = {
      create: jest.fn(),
      verify: jest.fn(),
      revoke: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    } as unknown as IJwtModel;

    mockLayers = {
      database: {
        db: {} as any,
        models: {
          jwt: mockJwtModel,
        },
      },
      clients: {},
      services: {},
      workflows: {},
    } as unknown as AppLayers;

    mockConfig = {
      env: "development",
    } as AppConfig;
  });

  describe("start", () => {
    it("should start all enabled jobs", () => {
      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();

      // Should schedule enabled jobs: dev-test + audit-retention + jwt-cleanup +
      // oauth-adapter-cleanup + plaid-webhook-processor + plaid-webhook-cleanup
      // (plaid-sync is disabled)
      expect(cron.schedule).toHaveBeenCalledTimes(6);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Started job:"),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipping disabled job: plaid-sync"),
      );
    });

    it("should skip disabled jobs", () => {
      mockConfig.env = "production";
      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();

      // Should schedule audit-retention + jwt-cleanup + oauth-adapter-cleanup +
      // plaid-webhook-processor + plaid-webhook-cleanup (dev-test disabled in
      // production, plaid-sync always disabled)
      expect(cron.schedule).toHaveBeenCalledTimes(5);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipping disabled job: dev-test"),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipping disabled job: plaid-sync"),
      );
    });

    it("should always schedule jwt cleanup job", () => {
      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();

      // All job factories should be called with service and config
      expect(createJwtCleanupJob).toHaveBeenCalledWith(mockLayers, mockConfig);
      expect(createDevTestJob).toHaveBeenCalledWith(mockLayers, mockConfig);
      expect(createPlaidSyncJob).toHaveBeenCalledWith(mockLayers, mockConfig);
      expect(createPlaidWebhookProcessorJob).toHaveBeenCalledWith(
        mockLayers,
        mockConfig,
      );
      expect(createPlaidWebhookCleanupJob).toHaveBeenCalledWith(
        mockLayers,
        mockConfig,
      );
      expect(createOauthAdapterCleanupJob).toHaveBeenCalledWith(
        mockLayers,
        mockConfig,
      );
      // 6 jobs scheduled in dev (dev-test + audit-retention + jwt-cleanup +
      // oauth-adapter-cleanup + plaid-webhook-processor +
      // plaid-webhook-cleanup), plaid-sync is disabled
      expect(cron.schedule).toHaveBeenCalledTimes(6);
    });
  });

  describe("stop", () => {
    it("should stop all running jobs", () => {
      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();
      scheduler.stop();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Stopped job:"),
      );
    });

    it("should clear the jobs map", () => {
      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();
      scheduler.stop();

      // Verify jobs are cleared by starting again (should schedule new jobs)
      jest.clearAllMocks();
      scheduler.start();
      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe("job error handling", () => {
    it("should catch and log job errors without crashing", async () => {
      // Mock job task that throws an error BEFORE starting scheduler
      const mockJobTask = jest.fn().mockRejectedValue(new Error("Job failed"));
      (createDevTestJob as jest.Mock).mockReturnValue({
        schedule: "*/5 * * * *",
        task: mockJobTask,
      });

      scheduler = new JobScheduler(mockLayers, mockConfig);
      scheduler.start();

      // Get the task wrapper function that was passed to cron.schedule
      const scheduleCall = (cron.schedule as jest.Mock).mock.calls[0];
      const taskWrapper = scheduleCall[1];

      // Execute the wrapped task - it should call our failing job task
      await taskWrapper();

      // Error should be logged but not thrown
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Job failed:"),
        expect.any(Error),
      );
    });
  });
});
