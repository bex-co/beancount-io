/**
 * The store products that sell a Beancount plan (ADR 001 D1).
 *
 * Each store is a merchant of record, so this maps a product to the tier and
 * cycle it grants and nothing more: prices, currencies and offers come from
 * the store at purchase time.
 */

import {
  type BillingInterval,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";
import { StoreProvider } from "../data/store-subscription-model";

export interface StorePlan {
  tier: SubscriptionTier;
  interval: BillingInterval;
}

/**
 * The six products of the one App Store subscription group. Group levels
 * (D6) are set in App Store Connect, not here.
 */
const APP_STORE_PRODUCTS: Readonly<Record<string, StorePlan>> = {
  "io.beancount.premium.monthly": {
    tier: SubscriptionTier.PREMIUM,
    interval: "month",
  },
  "io.beancount.premium.yearly": {
    tier: SubscriptionTier.PREMIUM,
    interval: "year",
  },
  "io.beancount.growth.monthly": {
    tier: SubscriptionTier.GROWTH,
    interval: "month",
  },
  "io.beancount.growth.yearly": {
    tier: SubscriptionTier.GROWTH,
    interval: "year",
  },
  "io.beancount.organization.monthly": {
    tier: SubscriptionTier.ORGANIZATION,
    interval: "month",
  },
  "io.beancount.organization.yearly": {
    tier: SubscriptionTier.ORGANIZATION,
    interval: "year",
  },
};

/** Google Play sells one subscription per tier... */
const GOOGLE_PLAY_SUBSCRIPTIONS: Readonly<Record<string, SubscriptionTier>> = {
  premium: SubscriptionTier.PREMIUM,
  growth: SubscriptionTier.GROWTH,
  organization: SubscriptionTier.ORGANIZATION,
};

/** ...with a base plan per billing cycle. */
const GOOGLE_PLAY_BASE_PLANS: Readonly<Record<string, BillingInterval>> = {
  monthly: "month",
  yearly: "year",
};

function lookup<T>(
  table: Readonly<Record<string, T>>,
  key: string | undefined,
) {
  return key !== undefined && Object.hasOwn(table, key) ? table[key] : null;
}

/**
 * The plan a store product grants, or null for anything not in the catalog.
 * Null fails closed: the caller records the row as UNKNOWN and grants nothing.
 */
export function storePlan(
  provider: StoreProvider,
  productId: string,
  basePlanId?: string,
): StorePlan | null {
  if (provider === StoreProvider.APP_STORE) {
    // App Store products carry their cycle; a base plan never applies.
    return basePlanId === undefined
      ? lookup(APP_STORE_PRODUCTS, productId)
      : null;
  }
  const tier = lookup(GOOGLE_PLAY_SUBSCRIPTIONS, productId);
  const interval = lookup(GOOGLE_PLAY_BASE_PLANS, basePlanId);
  return tier && interval ? { tier, interval } : null;
}
