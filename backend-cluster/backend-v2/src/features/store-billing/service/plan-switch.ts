import type { SubscriptionTier } from "@/features/stripe/service/stripe";
import { tierRank } from "@/features/stripe/service/subscription-plan";
import type {
  StoreProvider,
  StoreSubscription,
} from "../data/store-subscription-model";
import { grantedTier } from "./store-subscription-grant";

/**
 * Stripe refuses a Checkout `trial_end` under 48 hours away; the extra hour
 * covers the time between this check and Stripe's.
 */
const MIN_DEFERRAL_MS = 49 * 60 * 60 * 1000;

/** A store plan still running while the account buys a Stripe plan. */
export interface StorePlanOverlap {
  provider: StoreProvider;
  endsAt: Date;
  /** The first Stripe charge waits for `endsAt`; otherwise it is today. */
  deferred: boolean;
}

/**
 * What a switch to Stripe does beside a store plan the user has stopped
 * renewing (ADR 001 D15). A plan the store already covers starts when the
 * store plan ends, so nobody pays twice. A higher tier applies at once, so
 * Stripe charges now, and so does a plan with too little time left to defer.
 */
export function storePlanOverlap(
  storeSubscriptions: StoreSubscription[],
  targetTier: SubscriptionTier,
  now: Date,
): StorePlanOverlap | null {
  const running = storeSubscriptions
    .flatMap((row) => {
      const tier = grantedTier(row, now);
      return tier && row.accessEndsAt
        ? [{ provider: row.provider, tier, endsAt: row.accessEndsAt }]
        : [];
    })
    .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
  const covering = running.find(
    ({ tier }) => tierRank(tier) >= tierRank(targetTier),
  );
  const plan = covering ?? running[0];
  if (!plan) return null;
  return {
    provider: plan.provider,
    endsAt: plan.endsAt,
    deferred:
      covering !== undefined &&
      plan.endsAt.getTime() - now.getTime() >= MIN_DEFERRAL_MS,
  };
}
