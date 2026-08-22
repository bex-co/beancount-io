import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const jwts = pgTable(
  "jwts",
  {
    // Primary key: TEXT to support both ObjectId (migrated) and UUID (new) formats
    //
    // Hybrid ID Strategy:
    // - Migrated records: Preserve MongoDB ObjectId (24-char hex string)
    //   Example: "507f1f77bcf86cd799439011"
    // - New records: Generate UUID format (36-char with hyphens)
    //   Example: "550e8400-e29b-41d4-a716-446655440000"
    //
    // Why TEXT instead of UUID type?
    // - JWT tokens contain the ID in the 'jti' field
    // - Existing tokens have ObjectId format in jti
    // - TEXT allows both formats, preserving token compatibility after migration
    id: text("id").primaryKey(),

    // Foreign key to users table (TEXT to support ObjectId strings)
    userId: text("user_id").notNull(),

    // Token expiration timestamp
    expireAt: timestamp("expire_at").notNull(),

    // Timestamps
    createAt: timestamp("create_at").notNull().defaultNow(),
    updateAt: timestamp("update_at").notNull().defaultNow(),
  },
  (table) => [
    // Index on userId for efficient lookups
    index("jwts_user_id_idx").on(table.userId),
    // Index on expireAt for efficient cleanup of expired tokens
    index("jwts_expire_at_idx").on(table.expireAt),
  ],
);
