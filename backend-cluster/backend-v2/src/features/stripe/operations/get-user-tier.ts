import { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { IModels } from "@/foundation/models";
import { logger } from "@/shared/logger";
import {
  SubscriptionTier,
  TierLimits,
  SUBSCRIPTION_CONFIG,
  getTierLimits,
} from "../service/stripe";
import type { IStripeService } from "../service/stripe-service";

/**
 * Dependencies for the tier operations. Injected explicitly (not via `IService`)
 * so the functions are trivially testable — see the service conventions in
 * backend-v2/CLAUDE.md. `stripe` is the shared instance (`service.stripe`),
 * forwarded by the caller rather than constructed here.
 */
type TierDeps = {
  stripe: IStripeService;
  models: Pick<IModels, "paidCustomer">;
  postgresDb: NodePgDatabase;
};

export type GetUserTierParams = TierDeps & { userId: string };

/**
 * Cross-service operation: determine a user's subscription tier.
 *
 * Reads the `paidCustomer` model + queries Stripe via the injected
 * `StripeService` + resolves the plan against `SUBSCRIPTION_CONFIG`.
 */
export async function getUserTier({
  stripe,
  models,
  postgresDb,
  userId,
}: GetUserTierParams): Promise<SubscriptionTier> {
  const stripeService = stripe;
  try {
    // Check if user has an active subscription using the existing isPaid infrastructure
    const paidCustomer = await models.paidCustomer.findByUserIdWithActivePeriod(
      postgresDb,
      userId,
    );

    // If user has active subscription with valid period, determine tier from Stripe subscription
    if (paidCustomer?.currentPeriodEnd) {
      return getTierFromStripeSubscription(
        stripeService,
        userId,
        paidCustomer.clientId,
      );
    }

    // Fallback: Check Stripe subscriptions directly
    const stripeSubscriptions = await stripeService.listSubscriptions(userId);

    // Check if any subscription is active and get its tier
    const activeSubscription = stripeSubscriptions.find(
      (sub: { status: string }) => sub.status === "active",
    );

    if (activeSubscription) {
      // Try to determine tier from subscription items
      const paidCustomers = await models.paidCustomer.findByUserId(
        postgresDb,
        userId,
      );
      if (paidCustomers.length > 0) {
        return getTierFromStripeSubscription(
          stripeService,
          userId,
          paidCustomers[0].clientId,
        );
      }
      // Fallback to PREMIUM for legacy subscriptions without clientId
      return SubscriptionTier.PREMIUM;
    }

    return SubscriptionTier.FREE;
  } catch (error) {
    // On error, default to FREE tier for safety
    logger.error("Error determining user tier", {
      userId,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return SubscriptionTier.FREE;
  }
}

/**
 * Convenience: the user's current tier limits in one call.
 */
export async function getUserTierLimits(
  params: GetUserTierParams,
): Promise<TierLimits> {
  const tier = await getUserTier(params);
  return getTierLimits(tier);
}

/**
 * Determine tier from a Stripe subscription by matching price IDs against the
 * client's configured plans.
 */
async function getTierFromStripeSubscription(
  stripeService: IStripeService,
  userId: string,
  clientId: string,
): Promise<SubscriptionTier> {
  try {
    const subscriptions = await stripeService.listSubscriptions(userId);

    const activeSubscription = subscriptions.find(
      (sub: { status: string }) => sub.status === "active",
    );

    if (!activeSubscription) {
      return SubscriptionTier.FREE;
    }

    // Extract price ID from subscription items
    const priceId = activeSubscription.items?.data?.[0]?.price?.id;

    if (!priceId) {
      logger.warn("No price ID found in active subscription", {
        userId,
        subscriptionId: activeSubscription.id,
      });
      return SubscriptionTier.PREMIUM; // Fallback to PREMIUM
    }

    // Look up tier from SUBSCRIPTION_CONFIG
    const config = SUBSCRIPTION_CONFIG[clientId];
    if (!config) {
      logger.warn("Client config not found", { clientId, userId });
      return SubscriptionTier.PREMIUM; // Fallback to PREMIUM
    }

    // Find the plan with matching price ID
    const plan = config.plans.find((p) => p.priceId === priceId);

    if (plan) {
      return plan.tier;
    }

    logger.warn("Price ID not found in subscription config", {
      userId,
      clientId,
      priceId,
    });
    return SubscriptionTier.PREMIUM;
  } catch (error) {
    logger.error("Error getting tier from Stripe subscription", {
      userId,
      clientId,
      error: error instanceof Error ? error.message : String(error),
    });
    return SubscriptionTier.FREE;
  }
}
