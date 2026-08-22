import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "JwtCleanupJob" });

export const createJwtCleanupJob: JobFactory = (layers, _config) => {
  return {
    schedule: "0 0 * * *", // Daily at midnight
    task: async () => {
      await layers.database.models.jwt.deleteExpired(layers.database.db);
      jobLogger.debug("Cleaned up expired JWT tokens");
    },
  };
};
