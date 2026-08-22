import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { plaidWebhookEvents } from "./schema";
import type {
  PlaidWebhookEvent,
  CreatePlaidWebhookEventInput,
  PlaidWebhookEventStatus,
  IPlaidWebhookEventModel,
} from "./types";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

export class PlaidWebhookEventPostgresModel implements IPlaidWebhookEventModel {
  /**
   * Create a new webhook event (idempotent - ignores duplicates)
   *
   * ID is auto-generated using prefixed nanoid (pwe_*)
   *
   * @param db - Database instance
   * @param input - Webhook event data
   * @returns Created webhook event
   */
  async create(
    db: PostgresJsDatabase,
    input: CreatePlaidWebhookEventInput,
  ): Promise<PlaidWebhookEvent> {
    // Auto-generate ID with prefix
    const id = prefixedNanoidBase58("pwe_");

    const [event] = await db
      .insert(plaidWebhookEvents)
      .values({
        ...input,
        id,
        status: "pending",
        attempts: 0,
        maxAttempts: 5,
        receivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing() // Idempotent - ignore duplicates
      .returning();

    if (!event) {
      // Event already exists, fetch it
      return this.getById(db, id);
    }

    return event;
  }

  /**
   * Get event by ID
   */
  async getById(
    db: PostgresJsDatabase,
    id: string,
  ): Promise<PlaidWebhookEvent> {
    const [event] = await db
      .select()
      .from(plaidWebhookEvents)
      .where(eq(plaidWebhookEvents.id, id))
      .limit(1);

    if (!event) {
      throw new Error(`Webhook event not found: ${id}`);
    }

    return event;
  }

  /**
   * Get pending events ready for processing
   * Includes events with status 'pending' or 'failed' that are ready for retry
   */
  async getPendingEvents(
    db: PostgresJsDatabase,
    limit = 50,
  ): Promise<PlaidWebhookEvent[]> {
    const now = new Date();

    return db
      .select()
      .from(plaidWebhookEvents)
      .where(
        and(
          sql`${plaidWebhookEvents.status} IN ('pending', 'failed')`,
          sql`${plaidWebhookEvents.attempts} < ${plaidWebhookEvents.maxAttempts}`,
          sql`(${plaidWebhookEvents.nextRetryAt} IS NULL OR ${plaidWebhookEvents.nextRetryAt} <= ${now})`,
        ),
      )
      .orderBy(plaidWebhookEvents.createdAt)
      .limit(limit);
  }

  /**
   * Update event status to 'processing'
   */
  async markAsProcessing(db: PostgresJsDatabase, id: string): Promise<void> {
    await db
      .update(plaidWebhookEvents)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(plaidWebhookEvents.id, id));
  }

  /**
   * Update event status to 'completed'
   */
  async markAsCompleted(db: PostgresJsDatabase, id: string): Promise<void> {
    await db
      .update(plaidWebhookEvents)
      .set({
        status: "completed",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plaidWebhookEvents.id, id));
  }

  /**
   * Handle processing failure with exponential backoff
   */
  async markAsFailed(
    db: PostgresJsDatabase,
    id: string,
    error: Error,
  ): Promise<void> {
    const event = await this.getById(db, id);
    const newAttempts = event.attempts + 1;

    // Calculate next retry time with exponential backoff
    // 2min, 4min, 8min, 16min, 32min
    const backoffMinutes = Math.pow(2, newAttempts);
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    const isFinalFailure = newAttempts >= event.maxAttempts;

    await db
      .update(plaidWebhookEvents)
      .set({
        status: "failed",
        attempts: newAttempts,
        nextRetryAt: isFinalFailure ? null : nextRetryAt,
        errorMessage: error.message,
        updatedAt: new Date(),
      })
      .where(eq(plaidWebhookEvents.id, id));
  }

  /**
   * Get events by item ID (for debugging)
   */
  async getByItemId(
    db: PostgresJsDatabase,
    itemId: string,
    limit = 100,
  ): Promise<PlaidWebhookEvent[]> {
    return db
      .select()
      .from(plaidWebhookEvents)
      .where(eq(plaidWebhookEvents.itemId, itemId))
      .orderBy(sql`${plaidWebhookEvents.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * Get events by status (for monitoring)
   */
  async getByStatus(
    db: PostgresJsDatabase,
    status: PlaidWebhookEventStatus,
    limit = 100,
  ): Promise<PlaidWebhookEvent[]> {
    return db
      .select()
      .from(plaidWebhookEvents)
      .where(eq(plaidWebhookEvents.status, status))
      .orderBy(sql`${plaidWebhookEvents.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * Delete completed webhook events older than the specified date
   *
   * Use this for cleanup to prevent the webhook events table from growing indefinitely.
   * Recommended: Delete events older than 30-90 days.
   *
   * @param db - Database instance
   * @param olderThan - Delete events completed before this date
   * @returns Number of deleted events
   */
  async deleteCompletedEvents(
    db: PostgresJsDatabase,
    olderThan: Date,
  ): Promise<number> {
    const result = await db
      .delete(plaidWebhookEvents)
      .where(
        and(
          eq(plaidWebhookEvents.status, "completed"),
          sql`${plaidWebhookEvents.processedAt} < ${olderThan}`,
        ),
      )
      .returning({ id: plaidWebhookEvents.id });

    return result.length;
  }
}
