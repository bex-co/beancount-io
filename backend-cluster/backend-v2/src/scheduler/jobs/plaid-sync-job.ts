import { logger } from "@/shared/logger";
import { plaidBackgroundPrincipal } from "@/server/api/authorization";
import type { JobFactory } from "../types";
import { PlaidItemPostgresModel } from "@/features/plaid/data/plaid-item-model";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";

const jobLogger = logger.child({ module: "PlaidSyncJob" });

// Maximum number of items to process per job run
const BATCH_SIZE = 50;

export const createPlaidSyncJob: JobFactory = (layers) => {
  return {
    schedule: "0 */6 * * *", // Every 6 hours
    task: async () => {
      const { db: postgresDb } = layers.database;
      const { plaidClient, favaClientFactory } = layers.clients;
      const plaidItemModel = new PlaidItemPostgresModel();

      const plaidSyncService = new PlaidSyncService(
        plaidClient,
        favaClientFactory,
        layers.database.models,
        postgresDb,
        layers.services.authorization,
      );

      let offset = 0;
      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      let processedBatches = 0;

      // Process items in batches to prevent overwhelming the system
      while (true) {
        // Fetch a batch of active Items with pagination
        const activeItems = await plaidItemModel.getActiveItems(
          postgresDb,
          BATCH_SIZE,
          offset,
        );

        if (activeItems.length === 0) {
          if (processedBatches === 0) {
            jobLogger.debug("No active Plaid Items to sync");
          }
          break;
        }

        jobLogger.debug("Processing Plaid sync batch", {
          batchNumber: processedBatches + 1,
          itemCount: activeItems.length,
          offset,
        });

        let successCount = 0;
        let failureCount = 0;

        // Sync each Item independently - catch errors per item to continue processing
        for (const item of activeItems) {
          try {
            await plaidSyncService.syncItemTransactionsInBackground(
              plaidBackgroundPrincipal(item.userId, "plaid_scheduler"),
              item.id,
            );
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            jobLogger.error("Failed to sync Item in scheduled job", {
              itemId: item.id,
              userId: item.userId,
              error,
            });
            // Continue with next Item
          }
        }

        totalSuccessCount += successCount;
        totalFailureCount += failureCount;
        processedBatches += 1;

        jobLogger.debug("Batch sync completed", {
          batchNumber: processedBatches,
          batchSuccess: successCount,
          batchFailure: failureCount,
        });

        // If we got fewer items than the batch size, we've reached the end
        if (activeItems.length < BATCH_SIZE) {
          break;
        }

        offset += BATCH_SIZE;
      }

      if (processedBatches > 0) {
        jobLogger.debug("Scheduled Plaid sync completed", {
          totalBatches: processedBatches,
          totalSuccessCount,
          totalFailureCount,
        });
      }
    },
  };
};
