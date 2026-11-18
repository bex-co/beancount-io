import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "../user-model/schema";

/**
 * Accounts linked to the configured OIDC provider. The provider's `sub` is the
 * link, not the email: some providers let users change their own email.
 */
export const oidcIdentities = pgTable(
  "oidc_identities",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    sub: text("sub").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("oidc_identities_issuer_sub_idx").on(table.issuer, table.sub),
    uniqueIndex("oidc_identities_user_issuer_idx").on(
      table.userId,
      table.issuer,
    ),
  ],
);
