import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { plaidItems } from "../plaid-item-model/schema";

export const plaidSyncLogs = pgTable(
  "plaid_sync_logs",
  {
    id: text("id").primaryKey(),

    // Owner
    userId: text("user_id").notNull(),

    // Optional foreign key to plaid_items
    plaidItemId: text("plaid_item_id").references(() => plaidItems.id, {
      onDelete: "cascade",
    }),

    // Sync details
    syncType: text("sync_type").notNull(), // 'manual', 'webhook', 'scheduled'
    status: text("status").notNull(), // 'success', 'partial', 'failed'

    // Counts
    transactionsFetched: integer("transactions_fetched").notNull().default(0),
    transactionsAdded: integer("transactions_added").notNull().default(0),
    transactionsModified: integer("transactions_modified").notNull().default(0),
    transactionsRemoved: integer("transactions_removed").notNull().default(0),

    // Error tracking
    errorMessage: text("error_message"),

    // Timing
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),

    // Timestamp
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("plaid_sync_logs_user_id_idx").on(table.userId),
    index("plaid_sync_logs_item_id_idx").on(table.plaidItemId),
    index("plaid_sync_logs_created_at_idx").on(table.createdAt),
  ],
);
