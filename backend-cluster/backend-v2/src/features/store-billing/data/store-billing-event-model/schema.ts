import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  StoreEnvironment,
  StoreProvider,
} from "../store-subscription-model/types";

/**
 * The inbox of store notifications (ADR 001 D4). Recording an event first
 * makes a redelivery harmless and leaves a retry trail when processing fails.
 */
export const storeBillingEvents = pgTable(
  "store_billing_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").$type<StoreProvider>().notNull(),
    environment: text("environment").$type<StoreEnvironment>().notNull(),
    externalEventId: text("external_event_id").notNull(),
    // Kept only for replay, with personal data removed, for the retention
    // period the release gates set.
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    attempts: integer("attempts").notNull().default(0),
    // Redacted: never a token, a signed transaction or an account identifier.
    lastError: text("last_error"),
  },
  (table) => [
    uniqueIndex("store_billing_events_external_idx").on(
      table.provider,
      table.environment,
      table.externalEventId,
    ),
  ],
);
