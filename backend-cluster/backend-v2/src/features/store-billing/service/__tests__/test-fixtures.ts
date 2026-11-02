import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  StoreEnvironment,
  StoreProvider,
  type StoreSubscription,
  StoreSubscriptionStatus,
} from "../../data/store-subscription-model";

export const NOW = new Date("2026-11-01T12:00:00Z");
export const LATER = new Date("2026-12-01T12:00:00Z");

/** An active, renewing App Store subscription, unless overridden. */
export function aStoreSubscription(
  overrides: Partial<StoreSubscription> = {},
): StoreSubscription {
  return {
    id: "ssub_synthetic",
    userId: "user-1",
    provider: StoreProvider.APP_STORE,
    environment: StoreEnvironment.PRODUCTION,
    externalId: "original-transaction",
    replacedById: null,
    productId: "io.beancount.growth.yearly",
    basePlanId: null,
    tier: SubscriptionTier.GROWTH,
    cycle: "year",
    providerStatus: "1",
    status: StoreSubscriptionStatus.ACTIVE,
    accessEndsAt: LATER,
    willRenew: true,
    pendingProductId: null,
    acknowledgedAt: null,
    revokedAt: null,
    providerUpdatedAt: NOW,
    lastVerifiedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}
