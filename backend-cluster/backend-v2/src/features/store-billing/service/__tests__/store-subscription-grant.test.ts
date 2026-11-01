import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  StoreEnvironment,
  StoreProvider,
  type StoreSubscription,
  StoreSubscriptionStatus,
} from "../../data/store-subscription-model";
import {
  grantedTier,
  hasDuplicateBilling,
  renewsFromStore,
} from "../store-subscription-grant";

const NOW = new Date("2026-11-01T12:00:00Z");
const LATER = new Date("2026-12-01T12:00:00Z");

function subscription(
  overrides: Partial<StoreSubscription> = {},
): StoreSubscription {
  return {
    id: "ssub_synthetic",
    userId: "user-1",
    provider: StoreProvider.APP_STORE,
    environment: StoreEnvironment.PRODUCTION,
    externalId: "original-transaction",
    replacedById: null,
    productId: "io.beancount.growth.monthly",
    basePlanId: null,
    tier: SubscriptionTier.GROWTH,
    cycle: "month",
    providerStatus: "active",
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

describe("grantedTier (ADR 001 D4)", () => {
  it.each([StoreSubscriptionStatus.ACTIVE, StoreSubscriptionStatus.GRACE])(
    "grants the tier of a %s row",
    (status) => {
      expect(grantedTier(subscription({ status }), NOW)).toBe(
        SubscriptionTier.GROWTH,
      );
    },
  );

  it.each([
    StoreSubscriptionStatus.PENDING,
    StoreSubscriptionStatus.ON_HOLD,
    StoreSubscriptionStatus.EXPIRED,
    StoreSubscriptionStatus.REVOKED,
    StoreSubscriptionStatus.UNKNOWN,
  ])("grants nothing for a %s row", (status) => {
    expect(grantedTier(subscription({ status }), NOW)).toBeNull();
  });

  it("grants until the instant access ends, and not at it", () => {
    const row = subscription({ accessEndsAt: NOW });
    expect(grantedTier(row, new Date(NOW.getTime() - 1))).toBe(
      SubscriptionTier.GROWTH,
    );
    expect(grantedTier(row, NOW)).toBeNull();
  });

  it("grants nothing for a stale ACTIVE row whose access has passed", () => {
    expect(
      grantedTier(subscription({ accessEndsAt: new Date(0) }), NOW),
    ).toBeNull();
  });

  it("grants nothing before a purchase has an end of access", () => {
    expect(grantedTier(subscription({ accessEndsAt: null }), NOW)).toBeNull();
  });

  it("grants nothing for a purchase no account has claimed", () => {
    expect(grantedTier(subscription({ userId: null }), NOW)).toBeNull();
  });

  it("grants nothing once a newer purchase replaced the row", () => {
    expect(
      grantedTier(subscription({ replacedById: "ssub_newer" }), NOW),
    ).toBeNull();
  });

  it("grants nothing for a product outside the catalog", () => {
    expect(grantedTier(subscription({ tier: null }), NOW)).toBeNull();
  });
});

describe("renewsFromStore (ADR 001 D5)", () => {
  it.each([
    StoreSubscriptionStatus.ACTIVE,
    StoreSubscriptionStatus.GRACE,
    StoreSubscriptionStatus.ON_HOLD,
  ])("counts a %s row set to renew", (status) => {
    expect(renewsFromStore(subscription({ status }))).toBe(true);
  });

  it.each([
    StoreSubscriptionStatus.PENDING,
    StoreSubscriptionStatus.EXPIRED,
    StoreSubscriptionStatus.REVOKED,
    StoreSubscriptionStatus.UNKNOWN,
  ])("does not count a %s row", (status) => {
    expect(renewsFromStore(subscription({ status }))).toBe(false);
  });

  it("does not count a row with renewal turned off", () => {
    expect(renewsFromStore(subscription({ willRenew: false }))).toBe(false);
  });

  it("does not count a row a newer purchase replaced", () => {
    expect(renewsFromStore(subscription({ replacedById: "ssub_newer" }))).toBe(
      false,
    );
  });
});

describe("hasDuplicateBilling (ADR 001 D5)", () => {
  const renewing = subscription();
  const ending = subscription({ willRenew: false });

  it("flags a store and Stripe subscription that both renew", () => {
    expect(hasDuplicateBilling([renewing], 1)).toBe(true);
  });

  it("flags two renewing store subscriptions", () => {
    expect(hasDuplicateBilling([renewing, renewing], 0)).toBe(true);
  });

  it.each([
    ["a store subscription alone", [renewing], 0],
    ["a Stripe subscription alone", [], 1],
    ["a store plan that is ending beside Stripe", [ending], 1],
    ["neither source", [], 0],
  ])("does not flag %s", (_, rows, stripeRenewals) => {
    expect(hasDuplicateBilling(rows, stripeRenewals)).toBe(false);
  });
});
