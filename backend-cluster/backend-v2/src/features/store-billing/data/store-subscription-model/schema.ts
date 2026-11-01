import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  BillingInterval,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";
import type {
  StoreEnvironment,
  StoreProvider,
  StoreSubscriptionStatus,
} from "./types";

/**
 * The current state of each App Store or Google Play subscription (ADR 001
 * D4). A row is what Beancount last verified with the store, never what a
 * client or a notification claimed.
 */
export const storeSubscriptions = pgTable(
  "store_subscriptions",
  {
    id: text("id").primaryKey(),
    // Null until a signed-in account presents the purchase (D9).
    userId: text("user_id"),
    provider: text("provider").$type<StoreProvider>().notNull(),
    environment: text("environment").$type<StoreEnvironment>().notNull(),
    // Apple's original transaction ID, or Google's purchase token.
    externalId: text("external_id").notNull(),
    // The row that superseded this one through a Google linked purchase token.
    replacedById: text("replaced_by_id"),
    productId: text("product_id").notNull(),
    basePlanId: text("base_plan_id"),
    // Null for a product outside the catalog, which is UNKNOWN and grants nothing.
    tier: text("tier").$type<SubscriptionTier>(),
    cycle: text("cycle").$type<BillingInterval>(),
    // The store's own status, kept for diagnosis.
    providerStatus: text("provider_status").notNull(),
    status: text("status").$type<StoreSubscriptionStatus>().notNull(),
    // End of the paid or grace period; null before a purchase completes.
    accessEndsAt: timestamp("access_ends_at"),
    willRenew: boolean("will_renew").notNull().default(false),
    pendingProductId: text("pending_product_id"),
    acknowledgedAt: timestamp("acknowledged_at"),
    revokedAt: timestamp("revoked_at"),
    // Orders writes, so a stale event cannot overwrite newer state.
    providerUpdatedAt: timestamp("provider_updated_at").notNull(),
    lastVerifiedAt: timestamp("last_verified_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // One store purchase never grants access to two accounts.
    uniqueIndex("store_subscriptions_external_idx").on(
      table.provider,
      table.environment,
      table.externalId,
    ),
    index("store_subscriptions_user_idx").on(table.userId),
    // The hourly reconciliation looks for rows close to the end of access.
    index("store_subscriptions_access_ends_idx").on(table.accessEndsAt),
  ],
);
