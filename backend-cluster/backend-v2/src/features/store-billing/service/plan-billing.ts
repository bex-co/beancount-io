import {
  StoreProvider,
  type StoreSubscription,
  type StoreSubscriptionStatus,
} from "../data/store-subscription-model";
import {
  GOOGLE_PLAY_PACKAGE,
  type StorePlan,
  storePlan,
} from "./store-catalog";
import { grantedTier, renewsFromStore } from "./store-subscription-grant";

export type BillingSource = "NONE" | "STRIPE" | StoreProvider;

interface StoreSubscriptionSummary {
  provider: StoreProvider;
  productId: string;
  /** Null for a product outside the catalog. */
  tier: StoreSubscription["tier"];
  interval: StoreSubscription["cycle"];
  status: StoreSubscriptionStatus;
  accessEndsAt: Date | null;
  willRenew: boolean;
  scheduledChange: StorePlan | null;
  /** Google Play's page for the plan. Apple has none on the Web (D14). */
  managementUrl: string | null;
}

export interface PlanBilling {
  source: BillingSource;
  duplicateBilling: boolean;
  store: StoreSubscriptionSummary | null;
}

/** The Stripe subscriptions behind a plan, and those that will renew. */
export interface StripePlanCounts {
  held: number;
  renewing: number;
}

function summarize(subscription: StoreSubscription): StoreSubscriptionSummary {
  const { provider, productId, basePlanId, pendingProductId } = subscription;
  return {
    provider,
    productId,
    tier: subscription.tier,
    interval: subscription.cycle,
    status: subscription.status,
    accessEndsAt: subscription.accessEndsAt,
    willRenew: subscription.willRenew,
    scheduledChange: pendingProductId
      ? storePlan(provider, pendingProductId, basePlanId)
      : null,
    managementUrl:
      provider === StoreProvider.GOOGLE_PLAY
        ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(productId)}&package=${GOOGLE_PLAY_PACKAGE}`
        : null,
  };
}

/**
 * Who bills the account's plan (ADR 001 D5): the source that will renew, or
 * failing that the one whose paid period is still running. A store comes
 * first when both renew, because that is the source Stripe refuses to sell
 * over.
 */
export function planBilling(
  storeSubscriptions: StoreSubscription[],
  stripe: StripePlanCounts,
  now: Date,
): PlanBilling {
  const renewing = storeSubscriptions.filter(renewsFromStore);
  const current =
    renewing[0] ??
    storeSubscriptions.find((row) => grantedTier(row, now) !== null);

  const source = (): BillingSource => {
    if (renewing[0]) return renewing[0].provider;
    if (stripe.renewing > 0) return "STRIPE";
    if (current) return current.provider;
    return stripe.held > 0 ? "STRIPE" : "NONE";
  };

  return {
    source: source(),
    // A store cannot refuse a purchase after taking payment, so paying twice
    // is reported rather than prevented.
    duplicateBilling: renewing.length + stripe.renewing > 1,
    store: current ? summarize(current) : null,
  };
}
