import {
  pgTable,
  text,
  timestamp,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const plaidItems = pgTable(
  "plaid_items",
  {
    id: text("id").primaryKey(),

    // Owner
    userId: text("user_id").notNull(),

    // Ledger scope — Gitea's numeric repo id (see
    // tmp/plaid-ledger-scope-migration-plan.md); rename-proof unlike an
    // "owner/name" string, which has no cascade-update path in this codebase.
    ledgerRepoId: bigint("ledger_repo_id", { mode: "number" }).notNull(),

    // Plaid identifiers
    itemId: text("item_id").notNull(),
    accessToken: text("access_token").notNull(), // Encrypted with AES-256-GCM
    institutionId: text("institution_id").notNull(),
    institutionName: text("institution_name").notNull(),

    // Status tracking
    status: text("status", {
      enum: ["active", "requires_reauth", "disabled"],
    })
      .notNull()
      .default("active"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // Sync cursor for incremental syncing
    transactionsCursor: text("transactions_cursor"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("plaid_items_user_id_idx").on(table.userId),
    index("plaid_items_status_idx").on(table.status),
    index("plaid_items_ledger_repo_id_idx").on(table.ledgerRepoId),
    uniqueIndex("plaid_items_item_id_idx").on(table.itemId),
  ],
);
