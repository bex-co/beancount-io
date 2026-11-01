import { and, eq, sql } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { storeBillingEvents } from "./schema";
import type {
  IStoreBillingEventModel,
  RecordStoreBillingEventInput,
  StoreBillingEvent,
} from "./types";

export class StoreBillingEventPostgresModel implements IStoreBillingEventModel {
  async record(
    db: DbExecutor,
    input: RecordStoreBillingEventInput,
  ): Promise<{ event: StoreBillingEvent; isNew: boolean }> {
    const table = storeBillingEvents;
    const [inserted] = await db
      .insert(table)
      .values({ ...input, id: prefixedNanoidBase58("sbev_") })
      .onConflictDoNothing({
        target: [table.provider, table.environment, table.externalEventId],
      })
      .returning();
    if (inserted) return { event: inserted, isNew: true };

    const [event] = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.provider, input.provider),
          eq(table.environment, input.environment),
          eq(table.externalEventId, input.externalEventId),
        ),
      )
      .limit(1);
    return { event, isNew: false };
  }

  async markProcessed(db: DbExecutor, id: string): Promise<void> {
    await db
      .update(storeBillingEvents)
      .set({
        processedAt: new Date(),
        attempts: sql`${storeBillingEvents.attempts} + 1`,
        lastError: null,
      })
      .where(eq(storeBillingEvents.id, id));
  }

  async markFailed(db: DbExecutor, id: string, error: string): Promise<void> {
    await db
      .update(storeBillingEvents)
      .set({
        attempts: sql`${storeBillingEvents.attempts} + 1`,
        lastError: error,
      })
      .where(eq(storeBillingEvents.id, id));
  }
}
