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
   * Atomically adds tokensToAdd only while the stored count is below
   * maxAllowed (a missing row counts as 0), in one statement, so concurrent
   * callers cannot all pass on the same reading.
   * @returns The new total, or null when the count had already reached maxAllowed
   */
  reserveAndGetCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToAdd: number,
    maxAllowed: number,
  ): Promise<number | null>;

  /**
   * Subtracts tokensToRelease from an existing count, never below 0.
   */
  releaseCount(
    db: DbExecutor,
    userId: string,
    featureKey: string,
    billingMonth: string,
    tokensToRelease: number,
  ): Promise<void>;

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
