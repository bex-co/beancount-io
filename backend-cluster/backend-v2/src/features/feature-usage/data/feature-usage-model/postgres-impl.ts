import { eq, and, sql } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { IFeatureUsageModel } from "./types";
import { featureUsage } from "./schema";

export class FeatureUsagePostgresModel implements IFeatureUsageModel {
  public async addAndGetCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToAdd: number,
  ): Promise<number> {
    const result = await db
      .insert(featureUsage)
      .values({
        id: prefixedNanoidBase58("ftusg_"),
        userId,
        featureKey,
        billingMonth,
        usageCount: tokensToAdd,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          featureUsage.userId,
          featureUsage.featureKey,
          featureUsage.billingMonth,
        ],
        set: {
          usageCount: sql`${featureUsage.usageCount} + ${tokensToAdd}`,
          updatedAt: new Date(),
        },
      })
      .returning({ usageCount: featureUsage.usageCount });

    return result[0].usageCount;
  }

  public async reserveAndGetCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToAdd: number,
    maxAllowed: number,
  ): Promise<number | null> {
    const result = await db
      .insert(featureUsage)
      .values({
        id: prefixedNanoidBase58("ftusg_"),
        userId,
        featureKey,
        billingMonth,
        usageCount: tokensToAdd,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          featureUsage.userId,
          featureUsage.featureKey,
          featureUsage.billingMonth,
        ],
        set: {
          usageCount: sql`${featureUsage.usageCount} + ${tokensToAdd}`,
          updatedAt: new Date(),
        },
        setWhere: sql`${featureUsage.usageCount} < ${maxAllowed}`,
      })
      .returning({ usageCount: featureUsage.usageCount });

    return result[0]?.usageCount ?? null;
  }

  public async releaseCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToRelease: number,
  ): Promise<void> {
    await db
      .update(featureUsage)
      .set({
        usageCount: sql`greatest(${featureUsage.usageCount} - ${tokensToRelease}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureKey, featureKey),
          eq(featureUsage.billingMonth, billingMonth),
        ),
      );
  }

  public async getCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
  ): Promise<number> {
    const result = await db
      .select({ usageCount: featureUsage.usageCount })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureKey, featureKey),
          eq(featureUsage.billingMonth, billingMonth),
        ),
      )
      .limit(1);

    return result[0]?.usageCount ?? 0;
  }
}
