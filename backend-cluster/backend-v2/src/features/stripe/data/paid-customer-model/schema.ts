import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const paidCustomers = pgTable(
  "paid_customers",
  {
    // Primary key: UUID (NOT ObjectId - per migration docs)
    id: uuid("id").defaultRandom().primaryKey(),

    // Foreign key to users table (TEXT to support ObjectId strings)
    userId: text("user_id").notNull(),

    // Stripe customer ID (unique per migration docs)
    stripeCustomerId: text("stripe_customer_id").notNull(),

    // Client ID (composite unique with userId)
    clientId: text("client_id").notNull(),

    // Optional customer metadata
    email: text("email"),
    name: text("name"),
    phone: text("phone"),

    // Subscription period end
    currentPeriodEnd: timestamp("current_period_end"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint on stripeCustomerId
    uniqueIndex("stripe_customer_id_idx").on(table.stripeCustomerId),
    // Composite unique index on (userId, clientId)
    uniqueIndex("user_client_idx").on(table.userId, table.clientId),
    // Composite index for findByStripeCustomerIdAndClientId() query
    index("paid_customers_stripe_client_idx").on(
      table.stripeCustomerId,
      table.clientId,
    ),
    // Composite index for findByUserIdWithActivePeriod() query
    // Filters: userId = ? AND currentPeriodEnd > NOW()
    index("paid_customers_user_period_idx").on(
      table.userId,
      table.currentPeriodEnd,
    ),
  ],
);
