import { deleteExpiredOauthAdapterRecords } from "@/features/oauth/data/oauth-adapter-model";
import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "OauthAdapterCleanupJob" });

export const createOauthAdapterCleanupJob: JobFactory = (layers, _config) => {
  return {
    schedule: "0 0 * * *", // Daily at midnight
    task: async () => {
      await deleteExpiredOauthAdapterRecords(layers.database.db);
      jobLogger.debug("Cleaned up expired OAuth adapter records");
    },
  };
};
