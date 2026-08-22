import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    // CRITICAL: Use TEXT primary key to preserve MongoDB ObjectIds
    // User IDs are embedded in JWT tokens distributed to external clients
    // Changing user IDs would invalidate all existing JWT tokens
    // Must support both ObjectIds (24 chars) and UUIDs (36 chars)
    id: text("id").primaryKey(),

    // Authentication fields
    password: text("password"),
    email: text("email").notNull(),

    // User profile
    ip: text("ip"),
    avatar: text("avatar"),
    locale: text("locale").notNull().default("en"),
    firstName: text("first_name"),
    lastName: text("last_name"),

    // Account status
    isBlocked: boolean("is_blocked").notNull().default(false),

    // Ledger credentials
    ledger_username: text("ledger_username").notNull(),
    ledger_password: text("ledger_password").notNull(),
    ledger_api_token: text("ledger_api_token"),

    // Timestamps
    createAt: timestamp("create_at").notNull().defaultNow(),
    updateAt: timestamp("update_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at"),
  },
  (table) => [
    // Unique constraint on email
    uniqueIndex("users_email_idx").on(table.email),
    // Index on ledger_username for username lookups (case-insensitive ILIKE queries)
    index("users_ledger_username_idx").on(table.ledger_username),
    // Composite index for getActiveUsersWithUsername() query
    // Filters: isBlocked != true AND ledger_username IS NOT NULL
    index("users_active_with_username_idx").on(
      table.isBlocked,
      table.ledger_username,
    ),
    // Index for getRecentlySeenUsers() — range filter + ORDER BY on last_seen_at
    index("users_last_seen_at_idx").on(table.lastSeenAt),
  ],
);
