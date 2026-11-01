import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { StoreProvider, storePlan } from "../store-catalog";

const { PREMIUM, GROWTH, ORGANIZATION } = SubscriptionTier;

describe("storePlan (ADR 001 D1)", () => {
  it.each([
    ["io.beancount.premium.monthly", PREMIUM, "month"],
    ["io.beancount.premium.yearly", PREMIUM, "year"],
    ["io.beancount.growth.monthly", GROWTH, "month"],
    ["io.beancount.growth.yearly", GROWTH, "year"],
    ["io.beancount.organization.monthly", ORGANIZATION, "month"],
    ["io.beancount.organization.yearly", ORGANIZATION, "year"],
  ])(
    "maps App Store product %s to %s billed per %s",
    (product, tier, interval) => {
      expect(storePlan(StoreProvider.APP_STORE, product)).toEqual({
        tier,
        interval,
      });
    },
  );

  it.each([
    ["premium", "monthly", PREMIUM, "month"],
    ["premium", "yearly", PREMIUM, "year"],
    ["growth", "monthly", GROWTH, "month"],
    ["growth", "yearly", GROWTH, "year"],
    ["organization", "monthly", ORGANIZATION, "month"],
    ["organization", "yearly", ORGANIZATION, "year"],
  ])(
    "maps Google Play %s / %s to %s billed per %s",
    (product, basePlan, tier, interval) => {
      expect(storePlan(StoreProvider.GOOGLE_PLAY, product, basePlan)).toEqual({
        tier,
        interval,
      });
    },
  );

  it.each<[string, StoreProvider, string, string | undefined]>([
    [
      "an unknown App Store product",
      StoreProvider.APP_STORE,
      "io.beancount.enterprise.yearly",
      undefined,
    ],
    [
      "an App Store product with a base plan",
      StoreProvider.APP_STORE,
      "io.beancount.premium.monthly",
      "monthly",
    ],
    [
      "a Google Play ID on the App Store",
      StoreProvider.APP_STORE,
      "premium",
      undefined,
    ],
    [
      "an unknown Google Play subscription",
      StoreProvider.GOOGLE_PLAY,
      "enterprise",
      "monthly",
    ],
    [
      "an unknown Google Play base plan",
      StoreProvider.GOOGLE_PLAY,
      "premium",
      "weekly",
    ],
    [
      "a Google Play subscription without a base plan",
      StoreProvider.GOOGLE_PLAY,
      "premium",
      undefined,
    ],
    [
      "an App Store ID on Google Play",
      StoreProvider.GOOGLE_PLAY,
      "io.beancount.premium.monthly",
      "monthly",
    ],
    [
      "an inherited object key",
      StoreProvider.APP_STORE,
      "constructor",
      undefined,
    ],
    [
      "an inherited key as a base plan",
      StoreProvider.GOOGLE_PLAY,
      "premium",
      "toString",
    ],
  ])("fails closed on %s", (_, provider, product, basePlan) => {
    expect(storePlan(provider, product, basePlan)).toBeNull();
  });
});
