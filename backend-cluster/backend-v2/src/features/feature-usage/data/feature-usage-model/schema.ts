import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const featureUsage = pgTable(
  "feature_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    featureKey: text("feature_key").notNull(),
    billingMonth: text("billing_month").notNull(), // "YYYY-MM"
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("feature_usage_user_feature_month_idx").on(
      table.userId,
      table.featureKey,
      table.billingMonth,
    ),
  ],
);
