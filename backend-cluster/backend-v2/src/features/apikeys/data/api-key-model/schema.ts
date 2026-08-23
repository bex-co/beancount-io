import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Durable credentials for non-browser clients (ADR 0006 D6).
 *
 * The plaintext key is never here. What is stored is a sha256 digest — which is
 * what a lookup compares against — plus a short display prefix so a person can
 * tell their keys apart in a list without the secret being in that list.
 * `bcio_` keys are high-entropy random strings rather than passwords, so a
 * plain digest is the right primitive: there is nothing to brute-force back.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    /** `akey_<base58>`, this row's own id — safe to show and to delete by. */
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** What the key is for, chosen by whoever minted it. */
    name: text("name").notNull(),
    /** sha256 of the plaintext key, hex. The only copy of the secret's shadow. */
    keyDigest: text("key_digest").notNull(),
    /** First few characters of the plaintext, for display only (`bcio_a1b2c3d4`). */
    keyPrefix: text("key_prefix").notNull(),
    /** Granted scopes, a subset of the closed `ledger.*` vocabulary. */
    scopes: text("scopes").array().notNull(),
    /** `owner/name` when the key is confined to one ledger; null when it is not. */
    ledgerScope: text("ledger_scope"),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Every authenticated request with a `bcio_` key is this lookup, so it is
    // the one index that has to exist.
    uniqueIndex("api_keys_digest_idx").on(table.keyDigest),
    index("api_keys_user_idx").on(table.userId),
  ],
);
