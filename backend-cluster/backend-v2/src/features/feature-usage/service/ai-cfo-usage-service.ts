import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import { getTierLimits } from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import type {
  IFeatureUsageService,
  UsageCheckResult,
} from "./feature-usage-service";
import { RateLimitedError, ServiceUnavailableError } from "@/shared/errors";
import { logger } from "@/shared/logger";

const usageLogger = logger.child({ module: "ai-cfo-usage-service" });

export const FEATURE_KEY_AI_CFO = "ai_cfo";

export type AiCfoUsageInfo = {
  currentCount: number;
  maxAllowed: number;
  tier: string;
  billingMonth: string;
};

/**
 * Thin convenience wrapper around FeatureUsageService for AI CFO token billing.
 * Resolves the user's tier to determine the token limit, then delegates to the generic service.
 */
export interface IAiCfoUsageService {
  check(userId: string): Promise<UsageCheckResult>;
  assertQuotaAvailable(userId: string): Promise<void>;
  addTokenUsage(userId: string, totalTokens: number): Promise<void>;
  getUsage(userId: string): Promise<AiCfoUsageInfo>;
}

export class AiCfoUsageService implements IAiCfoUsageService {
  constructor(
    private readonly featureUsageService: IFeatureUsageService,
    private readonly stripe: IStripeService,
    private readonly models: Pick<IModels, "paidCustomer">,
    private readonly postgresDb: NodePgDatabase,
  ) {}

  /**
   * Checks whether the user has remaining token quota (read-only, no increment).
   * Call this before running the LLM to gate access.
   */
  async check(userId: string): Promise<UsageCheckResult> {
    const tier = await getUserTier({
      stripe: this.stripe,
      models: this.models,
      postgresDb: this.postgresDb,
      userId,
    });
    const tierLimits = getTierLimits(tier);
    const result = await this.featureUsageService.checkUsage(
      userId,
      FEATURE_KEY_AI_CFO,
      tierLimits.aiCfoTokensMax,
    );
    return result;
  }

  async assertQuotaAvailable(userId: string): Promise<void> {
    try {
      const result = await this.check(userId);
      if (!result.allowed) {
        usageLogger.warn("AI CFO token limit reached", {
          userId,
          currentCount: result.currentCount,
          maxAllowed: result.maxAllowed,
          billingMonth: result.billingMonth,
        });
        throw new RateLimitedError(
          undefined,
          "AI CFO monthly token limit reached",
          {
            currentCount: result.currentCount,
            maxAllowed: result.maxAllowed,
            billingMonth: result.billingMonth,
          },
        );
      }
    } catch (err) {
      if (err instanceof RateLimitedError) throw err;
      usageLogger.error("AI CFO usage check failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new ServiceUnavailableError("AI CFO");
    }
  }

  /**
   * Adds the actual token count consumed by a completed LLM request.
   * Call this after the handler returns with token usage.
   */
  async addTokenUsage(userId: string, totalTokens: number): Promise<void> {
    await this.featureUsageService.addTokenUsage(
      userId,
      FEATURE_KEY_AI_CFO,
      totalTokens,
    );
  }

  /**
   * Read-only usage info for display (e.g., user profile).
   */
  async getUsage(userId: string): Promise<AiCfoUsageInfo> {
    const tier = await getUserTier({
      stripe: this.stripe,
      models: this.models,
      postgresDb: this.postgresDb,
      userId,
    });
    const tierLimits = getTierLimits(tier);
    const { currentCount, billingMonth } =
      await this.featureUsageService.getUsage(userId, FEATURE_KEY_AI_CFO);
    return {
      currentCount,
      maxAllowed: tierLimits.aiCfoTokensMax,
      tier,
      billingMonth,
    };
  }
}
