import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";
import { PlaidWebhookEventPostgresModel } from "@/features/plaid/data/plaid-webhook-event-model";
import { PlaidWebhookService } from "@/features/plaid/service/plaid-webhook-service";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";

const jobLogger = logger.child({ module: "PlaidWebhookProcessorJob" });

/**
 * Scheduled job to process queued Plaid webhook events
 *
 * Runs every 2 minutes to process pending webhook events that were
 * stored by the fast webhook receiver endpoint.
 *
 * Features:
 * - Processes up to 50 events per run
 * - Automatic retry with exponential backoff (2min, 4min, 8min, 16min, 32min)
 * - Handles failures gracefully without blocking other events
 * - Idempotent processing via PlaidWebhookService
 */
export const createPlaidWebhookProcessorJob: JobFactory = (layers) => {
  return {
    schedule: "*/2 * * * *", // Every 2 minutes
    task: async () => {
      const { db: postgresDb, models } = layers.database;
      const { plaidClient, favaClientFactory } = layers.clients;
      const webhookEventModel = new PlaidWebhookEventPostgresModel();
      const plaidSyncService = new PlaidSyncService(
        plaidClient,
        favaClientFactory,
        models,
        postgresDb,
        layers.services.authorization,
      );
      const webhookService = new PlaidWebhookService(
        models,
        postgresDb,
        plaidSyncService,
        favaClientFactory,
        layers.services.authorization,
      );

      // Fetch pending events ready for processing
      const events = await webhookEventModel.getPendingEvents(
        postgresDb,
        50, // Process up to 50 events per run
      );

      if (events.length === 0) {
        jobLogger.debug("No pending webhook events to process");
        return;
      }

      jobLogger.debug("Processing webhook events", { count: events.length });

      let successCount = 0;
      let failureCount = 0;

      // Process each event independently
      for (const event of events) {
        try {
          // Mark as processing to prevent duplicate processing
          await webhookEventModel.markAsProcessing(postgresDb, event.id);

          // Process via existing webhook service (handles business logic)
          await webhookService.handleEvent({
            webhook_type: event.webhookType,
            webhook_code: event.webhookCode,
            item_id: event.itemId,
            rawBody: event.rawBody,
          });

          // Mark as completed
          await webhookEventModel.markAsCompleted(postgresDb, event.id);
          successCount += 1;

          jobLogger.debug("Webhook event processed successfully", {
            eventId: event.id,
            webhookType: event.webhookType,
            webhookCode: event.webhookCode,
          });
        } catch (err) {
          // Mark as failed with exponential backoff retry
          await webhookEventModel.markAsFailed(
            postgresDb,
            event.id,
            err as Error,
          );
          failureCount += 1;

          jobLogger.error("Webhook event processing failed", {
            eventId: event.id,
            webhookType: event.webhookType,
            webhookCode: event.webhookCode,
            error: err,
          });

          // Continue processing other events
        }
      }

      // Use info level only if there were failures (important for monitoring)
      if (failureCount > 0) {
        jobLogger.info("Webhook processing batch completed with failures", {
          total: events.length,
          successCount,
          failureCount,
        });
      } else {
        jobLogger.debug("Webhook processing batch completed", {
          total: events.length,
          successCount,
        });
      }
    },
  };
};
