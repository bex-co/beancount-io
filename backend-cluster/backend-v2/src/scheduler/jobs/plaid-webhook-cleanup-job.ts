import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";
import { PlaidWebhookEventPostgresModel } from "@/features/plaid/data/plaid-webhook-event-model";

const jobLogger = logger.child({ module: "PlaidWebhookCleanupJob" });

// Delete completed webhook events older than 3 days
const RETENTION_DAYS = 3; // 3 days

export const createPlaidWebhookCleanupJob: JobFactory = (layers, _config) => {
  return {
    schedule: "0 2 * * *", // Daily at 2 AM
    task: async () => {
      const webhookEventModel = new PlaidWebhookEventPostgresModel();

      // Calculate cutoff date (3 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      jobLogger.debug("Starting webhook cleanup", {
        retentionDays: RETENTION_DAYS,
        cutoffDate,
      });

      // Delete old completed webhook events
      const deletedCount = await webhookEventModel.deleteCompletedEvents(
        layers.database.db,
        cutoffDate,
      );

      jobLogger.debug("Webhook cleanup completed", {
        deletedCount,
        retentionDays: RETENTION_DAYS,
      });
    },
  };
};
