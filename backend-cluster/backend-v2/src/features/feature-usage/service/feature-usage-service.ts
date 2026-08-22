import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { config } from "@/config/config";

export type UsageCheckResult = {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  billingMonth: string;
};

/**
 * Generic service for tracking and enforcing feature usage limits.
 * Any metered feature can use this service with a unique featureKey.
 */
export interface IFeatureUsageService {
  getCurrentBillingMonth(): string;
  checkUsage(
    userId: string,
    featureKey: string,
    maxAllowed: number,
  ): Promise<UsageCheckResult>;
  addTokenUsage(
    userId: string,
    featureKey: string,
    tokensToAdd: number,
  ): Promise<number>;
  getUsage(
    userId: string,
    featureKey: string,
  ): Promise<{ currentCount: number; billingMonth: string }>;
}

export class FeatureUsageService implements IFeatureUsageService {
  constructor(
    private readonly models: Pick<IModels, "featureUsage">,
    private readonly postgresDb: NodePgDatabase,
  ) {}

  /**
   * Returns the current billing month in "YYYY-MM" format (UTC).
   */
  getCurrentBillingMonth(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Checks whether the user is within their token limit (read-only, no increment).
   * @param userId - The user ID
   * @param featureKey - The feature identifier (e.g., "ai_cfo")
   * @param maxAllowed - The maximum allowed token count (-1 for unlimited)
   * @returns UsageCheckResult with allowed status and current counts
   */
  async checkUsage(
    userId: string,
    featureKey: string,
    maxAllowed: number,
  ): Promise<UsageCheckResult> {
    const billingMonth = this.getCurrentBillingMonth();

    if (config.env === "development") {
      return { allowed: true, currentCount: 0, maxAllowed: -1, billingMonth };
    }

    if (maxAllowed === -1) {
      return { allowed: true, currentCount: 0, maxAllowed, billingMonth };
    }

    const currentCount = await this.models.featureUsage.getCount(
      this.postgresDb,
      userId,
      featureKey,
      billingMonth,
    );

    return {
      allowed: currentCount < maxAllowed,
      currentCount,
      maxAllowed,
      billingMonth,
    };
  }

  /**
   * Atomically adds tokensToAdd to the usage counter for this billing month.
   * Should be called after the LLM response is complete.
   * @returns The new total token count
   */
  async addTokenUsage(
    userId: string,
    featureKey: string,
    tokensToAdd: number,
  ): Promise<number> {
    if (config.env === "development" || tokensToAdd <= 0) {
      return 0;
    }

    const billingMonth = this.getCurrentBillingMonth();
    return this.models.featureUsage.addAndGetCount(
      this.postgresDb,
      userId,
      featureKey,
      billingMonth,
      tokensToAdd,
    );
  }

  /**
   * Read-only usage count for display purposes.
   */
  async getUsage(
    userId: string,
    featureKey: string,
  ): Promise<{ currentCount: number; billingMonth: string }> {
    const billingMonth = this.getCurrentBillingMonth();
    const currentCount = await this.models.featureUsage.getCount(
      this.postgresDb,
      userId,
      featureKey,
      billingMonth,
    );
    return { currentCount, billingMonth };
  }
}
