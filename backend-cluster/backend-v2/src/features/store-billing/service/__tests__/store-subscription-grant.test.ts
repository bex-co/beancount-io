import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  StoreEnvironment,
  StoreProvider,
  type StoreSubscription,
  StoreSubscriptionStatus,
} from "../../data/store-subscription-model";
import { grantedTier } from "../store-subscription-grant";

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
