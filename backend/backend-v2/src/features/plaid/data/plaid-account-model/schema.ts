import {
  pgTable,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { plaidItems } from "../plaid-item-model/schema";

export const plaidAccounts = pgTable(
  "plaid_accounts",
  {
    id: text("id").primaryKey(),

    // Foreign key to plaid_items
    plaidItemId: text("plaid_item_id")
      .notNull()
      .references(() => plaidItems.id, { onDelete: "cascade" }),

    // Plaid identifiers
    accountId: text("account_id").notNull(),
    accountName: text("account_name").notNull(),
    accountType: text("account_type").notNull(), // 'depository', 'credit', 'loan', 'investment'
    accountSubtype: text("account_subtype"),
    mask: text("mask"), // Last 4 digits

    // Beancount mapping
    ledgerAccount: text("ledger_account"), // e.g., "Assets:Checking"

    // Currency used when writing this account's transactions to the ledger
    currency: text("currency").notNull().default("USD"),

    // Status
    enabled: boolean("enabled").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("plaid_accounts_item_id_idx").on(table.plaidItemId),
    index("plaid_accounts_enabled_idx").on(table.enabled),
    uniqueIndex("plaid_accounts_account_id_idx").on(table.accountId),
  ],
);
