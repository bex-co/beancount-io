import { type DbExecutor } from "@/drizzle/drizzle";

export interface IFeatureUsageModel {
  /**
   * Atomically adds tokensToAdd to the usage count for a user+feature+month combination.
   * Creates the row if it doesn't exist (upsert).
   * @returns The new total count after adding
   */
  addAndGetCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToAdd: number,
  ): Promise<number>;

  /**
   * Gets the current usage count for a user+feature+month combination.
   * @returns The current usage count (0 if no row exists)
   */
  getCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
  ): Promise<number>;
}
