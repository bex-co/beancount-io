import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The stable, non-secret identifiers an account gives the stores at purchase
 * (ADR 001 D4). They are stored rather than derived because a notification
 * carries only the identifier and must lead back to an account. One row per
 * account, so the user ID is the key.
 */
export const billingIdentities = pgTable(
  "billing_identities",
  {
    userId: text("user_id").primaryKey(),
    // Passed to StoreKit as `appAccountToken`, which must be a UUID.
    appleAppAccountToken: uuid("apple_app_account_token").notNull(),
    // Passed to Play Billing; opaque, so it carries no personal data.
    googleObfuscatedAccountId: text("google_obfuscated_account_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_identities_apple_token_idx").on(
      table.appleAppAccountToken,
    ),
    uniqueIndex("billing_identities_google_account_idx").on(
      table.googleObfuscatedAccountId,
    ),
  ],
);
