import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Stores raw Plaid webhook events for reliable async processing
 *
 * Design follows Plaid best practices:
 * - Fast webhook receiver stores events and returns 200 quickly
 * - Scheduled job processes events asynchronously
 * - Idempotent handling via unique ID constraint
 * - Handles out-of-order and duplicate events safely
 */
export const plaidWebhookEvents = pgTable(
  "plaid_webhook_events",
  {
    // Primary key - use Plaid event ID or generate from webhook data
    id: text("id").primaryKey(),

    // Event classification (always present)
    webhookType: text("webhook_type").notNull(), // 'TRANSACTIONS', 'ITEM', etc.
    webhookCode: text("webhook_code").notNull(), // 'SYNC_UPDATES_AVAILABLE', 'ERROR', etc.
    itemId: text("item_id").notNull(), // Plaid Item ID

    // Raw message body as received (for debugging, reprocessing)
    rawBody: text("raw_body").notNull(),

    // Processing status
    status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'

    // Retry tracking with exponential backoff
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextRetryAt: timestamp("next_retry_at"),

    // Error tracking
    errorMessage: text("error_message"),

    // Timestamps
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Query optimization for job processing
    index("plaid_webhook_events_status_idx").on(table.status),
    index("plaid_webhook_events_processing_idx").on(
      table.status,
      table.nextRetryAt,
    ),
    index("plaid_webhook_events_item_id_idx").on(table.itemId),
    index("plaid_webhook_events_created_at_idx").on(table.createdAt),
  ],
);
