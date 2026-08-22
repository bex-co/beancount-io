import { createDevTestJob } from "../dev-test-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

describe("createDevTestJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock layers
    mockLayers = {
      database: { db: {} as any, models: {} as any },
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
    const job = createDevTestJob(mockLayers, mockConfig);

    expect(job.schedule).toBe("*/5 * * * *"); // Every 5 minutes
    expect(job.task).toBeInstanceOf(Function);
  });

  it("should execute task without throwing errors", async () => {
    const job = createDevTestJob(mockLayers, mockConfig);

    // Test that the task can be executed successfully
    // We don't test logging details as they are diagnostic, not business logic
    await expect(job.task()).resolves.not.toThrow();
  });
});
