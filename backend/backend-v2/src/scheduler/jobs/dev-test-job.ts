import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "DevTestJob" });

export const createDevTestJob: JobFactory = (_layers, config) => {
  return {
    schedule: "*/5 * * * *", // Every 5 minutes
    task: async () => {
      jobLogger.debug("Running at", {
        timestamp: new Date().toISOString(),
        env: config.env,
      });
    },
  };
};
