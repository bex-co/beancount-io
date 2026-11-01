import { and, eq, sql } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { storeSubscriptions } from "./schema";
import type {
  IStoreSubscriptionModel,
  StoreSubscription,
  UpsertStoreSubscriptionInput,
} from "./types";

const fromInsert = (column: { name: string }) =>
  sql.raw(`excluded."${column.name}"`);

export class StoreSubscriptionPostgresModel implements IStoreSubscriptionModel {
  async upsert(
    db: DbExecutor,
    input: UpsertStoreSubscriptionInput,
  ): Promise<StoreSubscription> {
    const table = storeSubscriptions;
    const [written] = await db
      .insert(table)
      .values({ ...input, id: prefixedNanoidBase58("ssub_") })
      .onConflictDoUpdate({
        target: [table.provider, table.environment, table.externalId],
        set: {
          userId: sql`coalesce(${table.userId}, ${fromInsert(table.userId)})`,
          replacedById: fromInsert(table.replacedById),
          productId: fromInsert(table.productId),
          basePlanId: fromInsert(table.basePlanId),
          tier: fromInsert(table.tier),
          cycle: fromInsert(table.cycle),
          providerStatus: fromInsert(table.providerStatus),
          status: fromInsert(table.status),
          accessEndsAt: fromInsert(table.accessEndsAt),
          willRenew: fromInsert(table.willRenew),
          pendingProductId: fromInsert(table.pendingProductId),
          acknowledgedAt: fromInsert(table.acknowledgedAt),
          revokedAt: fromInsert(table.revokedAt),
          providerUpdatedAt: fromInsert(table.providerUpdatedAt),
          lastVerifiedAt: fromInsert(table.lastVerifiedAt),
          updatedAt: sql`now()`,
        },
        // An older event loses to the state already stored.
        setWhere: sql`${table.providerUpdatedAt} <= ${fromInsert(table.providerUpdatedAt)}`,
      })
      .returning();
    if (written) return written;

    const [current] = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.provider, input.provider),
          eq(table.environment, input.environment),
          eq(table.externalId, input.externalId),
        ),
      )
      .limit(1);
    return current;
  }

  async findByUserId(
    db: DbExecutor,
    userId: string,
  ): Promise<StoreSubscription[]> {
    return db
      .select()
      .from(storeSubscriptions)
      .where(eq(storeSubscriptions.userId, userId));
  }
}
