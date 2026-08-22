import {
  pgTable,
  text,
  date,
  decimal,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { plaidAccounts } from "../plaid-account-model/schema";

export const plaidTransactions = pgTable(
  "plaid_transactions",
  {
    id: text("id").primaryKey(),

    // Foreign key to plaid_accounts
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => plaidAccounts.id, { onDelete: "cascade" }),

    // Plaid identifiers
    transactionId: text("transaction_id").notNull(),
    pendingTransactionId: text("pending_transaction_id"),

    // Transaction data
    date: date("date").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    merchantName: text("merchant_name"),
    name: text("name").notNull(), // Transaction name
    category: text("category"), // JSON array as text (e.g., '["Food and Drink", "Restaurants"]')

    // Status
    isPending: boolean("is_pending").notNull().default(false),
    syncedToLedger: boolean("synced_to_ledger").notNull().default(false),
    ledgerEntryHash: text("ledger_entry_hash"), // SHA for idempotency

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("plaid_transactions_account_id_idx").on(table.plaidAccountId),
    index("plaid_transactions_date_idx").on(table.date),
    index("plaid_transactions_synced_idx").on(table.syncedToLedger),
    uniqueIndex("plaid_transactions_transaction_id_idx").on(
      table.transactionId,
    ),
  ],
);
