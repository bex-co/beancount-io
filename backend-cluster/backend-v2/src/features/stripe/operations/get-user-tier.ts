import Stripe from "stripe";
import { logger } from "@/shared/logger";
import { SubscriptionTier, TierLimits, getTierLimits } from "../service/stripe";
import {
  highestTier,
  holdsPaidTier,
  subscriptionTier,
} from "../service/subscription-plan";
import type { IStripeService } from "../service/stripe-service";

/** Stripe owns customer binding verification; tier selection is shared across consumers. */
type TierDeps = { stripe: IStripeService };

export type GetUserTierParams = TierDeps & { userId: string };

/**
 * Cross-service operation: determine a user's subscription tier, the highest
 * any source grants (ADR 001 D3).
 *
 * The sources are read apart so that neither failure can hide the other's
 * plan. The merged tier stays here: `paid_customers.period_tier` is Stripe's
 * own fallback, and a store plan written there would outlive its access.
 */
export async function getUserTier({
  stripe,
  userId,
}: GetUserTierParams): Promise<SubscriptionTier> {
  const [fromStripe, fromStores] = await Promise.all([
    stripeTier({ stripe, userId }),
    storeTiers({ stripe, userId }),
  ]);
  return highestTier([fromStripe, ...fromStores]);
}

/** Store rows live in Beancount's database, so no store is called here. */
async function storeTiers({
  stripe,
  userId,
}: GetUserTierParams): Promise<SubscriptionTier[]> {
  try {
    return await stripe.grantedStoreTiers(userId);
  } catch (error) {
    logger.error("Error reading store subscriptions", {
      userId,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Resolves verified live subscriptions against recognized prices. */
async function stripeTier({
  stripe,
  userId,
}: GetUserTierParams): Promise<SubscriptionTier> {
  try {
    // listSubscriptions verifies the user's exact configured customer binding.
    // Not canceled: a past-due subscription keeps its tier while Stripe
    // retries the renewal.
    const subscriptions = await stripe.listSubscriptions(userId, {
      status: "current",
    });
    const tiers = subscriptions.map(subscriptionTier);
    const unidentified = subscriptions.filter(
      (sub, index) =>
        holdsPaidTier(sub) && tiers[index] === SubscriptionTier.FREE,
    ).length;
    if (unidentified)
      logger.warn("Active subscriptions have no recognized live plan", {
        count: unidentified,
      });
    return highestTier(tiers);
  } catch (error) {
    const transient =
      error instanceof Stripe.errors.StripeConnectionError ||
      error instanceof Stripe.errors.StripeAPIError ||
      error instanceof Stripe.errors.StripeRateLimitError;
    logger.error("Error determining user tier", {
      userId,
      errorType: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    // A Stripe outage is not evidence the customer stopped paying: keep the
    // tier the last verified period paid for, when one is still current.
    // Any other failure, such as a binding that does not match, stays Free.
    if (!transient) return SubscriptionTier.FREE;
    let verified: SubscriptionTier | null = null;
    try {
      verified = await stripe.lastVerifiedTier(userId);
    } catch {
      // A failed cache read keeps today's fail-closed result.
    }
    if (verified) {
      logger.warn("Using the last verified tier while Stripe is unavailable", {
        userId,
        tier: verified,
      });
      return verified;
    }
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
