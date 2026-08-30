import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * The audit trail (ADR 0006 审计).
 *
 * Every column here is an identifier or an enum. That is the point, and it is
 * structural rather than a rule someone has to remember: there is no column an
 * argument value could be written to, so no secret can end up in this table by
 * a later change that logs "just a bit more context". A reviewer asking "could
 * a password reach the audit log?" reads this file and is done.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    /** Transport op ID, or a canonical action for a direct service call. */
    op: text("op").notNull(),
    /** The user, when the request had one. */
    userId: text("user_id"),
    /** How they authenticated: session / oauth / apikey. */
    method: text("method"),
    /** The credential's id — never its secret. */
    tokenId: text("token_id"),
    /** `owner/name` of the ledger acted on, when the op names one. */
    ledgerId: text("ledger_id"),
    /** allowed | denied | shadow-denied | error. */
    outcome: text("outcome").notNull(),
    at: timestamp("at").notNull().defaultNow(),
  },
  (table) => [
    // The two questions a security review actually asks: what did this caller
    // do, and what happened to this ledger.
    index("audit_events_user_at_idx").on(table.userId, table.at),
    index("audit_events_ledger_at_idx").on(table.ledgerId, table.at),
    // Retention sweeps scan by age.
    index("audit_events_at_idx").on(table.at),
  ],
);
