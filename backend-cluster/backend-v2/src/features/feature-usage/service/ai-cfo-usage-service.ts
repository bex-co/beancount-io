import type { IStripeService } from "@/features/stripe/service/stripe-service";
import { getTierLimits } from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import {
  billingMonthReset,
  type IFeatureUsageService,
  type UsageCheckResult,
  type UsageReservation,
} from "./feature-usage-service";
import {
  type LimitOwner,
  type QuotaScope,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  userResource,
  type IAuthorizationService,
} from "@/server/api/authorization";

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
  reserve(userId: string, estimatedTokens: number): Promise<UsageReservation>;
  settle(
    userId: string,
    reservation: Pick<UsageReservation, "billingMonth" | "reservedTokens">,
    actualTokens: number,
  ): Promise<void>;
  getUsage(identity: Identity): Promise<AiCfoUsageInfo>;
}

export class AiCfoUsageService implements IAiCfoUsageService {
  constructor(
    private readonly featureUsageService: IFeatureUsageService,
    private readonly stripe: IStripeService,
    private readonly authorization: IAuthorizationService,
  ) {}

  /**
   * Checks whether the user has remaining token quota (read-only, no increment).
   * Call this before running the LLM to gate access.
   */
  async check(userId: string): Promise<UsageCheckResult> {
    const tier = await getUserTier({
      stripe: this.stripe,
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
        const blockedUntil = billingMonthReset(result.billingMonth);
        throw new RateLimitedError(
          undefined,
          `This account's monthly AI quota is used up (${result.currentCount} of ${result.maxAllowed} tokens in ${result.billingMonth}). It resets at ${blockedUntil}.`,
          {
            quotaScope: "account_monthly" satisfies QuotaScope,
            blockedUntil,
            currentCount: result.currentCount,
            maxAllowed: result.maxAllowed,
            billingMonth: result.billingMonth,
            limitOwner: "REQUESTER" satisfies LimitOwner,
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
   * Admits an LLM request against the user's tier quota and holds its
   * estimated tokens until `settle`. Call it right before the model call;
   * `allowed: false` means the quota is spent.
   */
  async reserve(
    userId: string,
    estimatedTokens: number,
  ): Promise<UsageReservation> {
    const tier = await getUserTier({
      stripe: this.stripe,
      userId,
    });
    return this.featureUsageService.reserveUsage(
      userId,
      FEATURE_KEY_AI_CFO,
      getTierLimits(tier).aiCfoTokensMax,
      estimatedTokens,
    );
  }

  /**
   * Settles a reservation to the tokens the request actually used (0 when
   * it failed).
   */
  async settle(
    userId: string,
    reservation: Pick<UsageReservation, "billingMonth" | "reservedTokens">,
    actualTokens: number,
  ): Promise<void> {
    await this.featureUsageService.settleUsage(
      userId,
      FEATURE_KEY_AI_CFO,
      reservation,
      actualTokens,
    );
  }

  /**
   * Read-only usage info for display (e.g., user profile).
   */
  async getUsage(identity: Identity): Promise<AiCfoUsageInfo> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.USER_AI_USAGE_READ,
      resource: userResource(identity.userId),
    });
    const { userId } = identity;
    const tier = await getUserTier({
      stripe: this.stripe,
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
