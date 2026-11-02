import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { StoreSubscriptionStatus } from "../../data/store-subscription-model";
import { grantedTier, renewsFromStore } from "../store-subscription-grant";
import { aStoreSubscription, NOW } from "./test-fixtures";

const subscription = aStoreSubscription;

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
