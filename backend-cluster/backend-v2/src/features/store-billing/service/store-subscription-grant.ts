import type { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  type StoreSubscription,
  StoreSubscriptionStatus,
} from "../data/store-subscription-model";

const GRANTING_STATUSES: ReadonlySet<StoreSubscriptionStatus> = new Set([
  StoreSubscriptionStatus.ACTIVE,
  StoreSubscriptionStatus.GRACE,
]);

/** A held subscription still renews once its payment recovers. */
const RENEWING_STATUSES: ReadonlySet<StoreSubscriptionStatus> = new Set([
  ...GRANTING_STATUSES,
  StoreSubscriptionStatus.ON_HOLD,
]);

/**
 * The tier a stored subscription grants at `now`, or null when it grants
 * nothing (ADR 001 D4). A row needs an owner, a granting status, access that
 * has not ended, and no newer purchase that replaced it.
 */
export function grantedTier(
  subscription: StoreSubscription,
  now: Date,
): SubscriptionTier | null {
  const { userId, status, accessEndsAt, replacedById, tier } = subscription;
  if (userId === null || replacedById !== null) return null;
  if (!GRANTING_STATUSES.has(status)) return null;
  if (accessEndsAt === null || now >= accessEndsAt) return null;
  return tier;
}

/** Whether the store will bill this subscription again (ADR 001 D5). */
export function renewsFromStore(subscription: StoreSubscription): boolean {
  return (
    subscription.willRenew &&
    subscription.replacedById === null &&
    RENEWING_STATUSES.has(subscription.status)
  );
}
