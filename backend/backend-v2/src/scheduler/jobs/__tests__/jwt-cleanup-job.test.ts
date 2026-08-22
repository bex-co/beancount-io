import { createJwtCleanupJob } from "../jwt-cleanup-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { IJwtModel } from "@/features/auth/data/jwt-model/types";

describe("createJwtCleanupJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;
  let mockJwtModel: jest.Mocked<IJwtModel>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock JWT model
    mockJwtModel = {
      create: jest.fn(),
      verify: jest.fn(),
      revoke: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IJwtModel>;

    // Create mock layers
    mockLayers = {
      database: {
        db: {} as any,
        models: {
          jwt: mockJwtModel,
        } as any,
      },
      clients: {},
      services: {},
      workflows: {},
    } as unknown as AppLayers;

    // Create mock config
    mockConfig = {
      env: "development",
    } as AppConfig;
  });

  it("should create a job with correct schedule", () => {
    const job = createJwtCleanupJob(mockLayers, mockConfig);

    expect(job.schedule).toBe("0 0 * * *"); // Daily at midnight
    expect(job.task).toBeInstanceOf(Function);
  });

  it("should call deleteExpired when task is executed", async () => {
    const job = createJwtCleanupJob(mockLayers, mockConfig);

    await job.task();

    // Verify deleteExpired was called
    expect(mockJwtModel.deleteExpired).toHaveBeenCalled();
  });

  it("should throw errors to be caught by scheduler", async () => {
    const mockJwtModelWithError = {
      ...mockJwtModel,
      deleteExpired: jest.fn().mockRejectedValue(new Error("Database error")),
    } as jest.Mocked<IJwtModel>;

    mockLayers.database.models.jwt = mockJwtModelWithError;

    const job = createJwtCleanupJob(mockLayers, mockConfig);

    // Errors should propagate to the scheduler's error handling
    await expect(job.task()).rejects.toThrow("Database error");
  });
});
