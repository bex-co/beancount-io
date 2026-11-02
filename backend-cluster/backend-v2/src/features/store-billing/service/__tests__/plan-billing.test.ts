import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  StoreProvider,
  type StoreSubscription,
  StoreSubscriptionStatus,
} from "../../data/store-subscription-model";
import { planBilling } from "../plan-billing";
import { aStoreSubscription, LATER, NOW } from "./test-fixtures";

const NO_STRIPE = { held: 0, renewing: 0 };
const STRIPE_RENEWS = { held: 1, renewing: 1 };
const STRIPE_ENDING = { held: 1, renewing: 0 };

const row = aStoreSubscription;
const ending = row({ willRenew: false });
const expired = row({
  status: StoreSubscriptionStatus.EXPIRED,
  willRenew: false,
});

describe("planBilling source (ADR 001 D5)", () => {
  it.each<[string, StoreSubscription[], typeof NO_STRIPE, string]>([
    ["no plan anywhere", [], NO_STRIPE, "NONE"],
    ["an expired store plan alone", [expired], NO_STRIPE, "NONE"],
    ["a renewing Stripe plan", [], STRIPE_RENEWS, "STRIPE"],
    ["a Stripe plan running out", [], STRIPE_ENDING, "STRIPE"],
    ["a renewing store plan", [row()], NO_STRIPE, "APP_STORE"],
    ["a store plan running out", [ending], NO_STRIPE, "APP_STORE"],
    ["both renewing", [row()], STRIPE_RENEWS, "APP_STORE"],
    [
      "a Stripe plan that renews past an ending store plan",
      [ending],
      STRIPE_RENEWS,
      "STRIPE",
    ],
    [
      "a store plan that renews past an ending Stripe plan",
      [row()],
      STRIPE_ENDING,
      "APP_STORE",
    ],
    ["both running out", [ending], STRIPE_ENDING, "APP_STORE"],
  ])("with %s", (_, rows, stripe, source) => {
    expect(planBilling(rows, stripe, NOW).source).toBe(source);
  });

  it("names Google Play for a Google Play plan", () => {
    const google = row({ provider: StoreProvider.GOOGLE_PLAY });
    expect(planBilling([google], NO_STRIPE, NOW).source).toBe("GOOGLE_PLAY");
  });

  it("still names the store while a renewing plan is on hold", () => {
    const held = row({
      status: StoreSubscriptionStatus.ON_HOLD,
      accessEndsAt: new Date(0),
    });
    expect(planBilling([held], NO_STRIPE, NOW)).toMatchObject({
      source: "APP_STORE",
      store: { status: "ON_HOLD" },
    });
  });
});

describe("planBilling duplicate flag (ADR 001 D5)", () => {
  it("is set when a store and Stripe both renew", () => {
    expect(planBilling([row()], STRIPE_RENEWS, NOW).duplicateBilling).toBe(
      true,
    );
  });

  it("is set when two store subscriptions both renew", () => {
    expect(planBilling([row(), row()], NO_STRIPE, NOW).duplicateBilling).toBe(
      true,
    );
  });

  it("is clear while switching, with one side already ending", () => {
    expect(planBilling([ending], STRIPE_RENEWS, NOW).duplicateBilling).toBe(
      false,
    );
  });

  it.each<[string, StoreSubscription[], typeof NO_STRIPE]>([
    ["a store plan alone", [row()], NO_STRIPE],
    ["a Stripe plan alone", [], STRIPE_RENEWS],
    ["no plan", [], NO_STRIPE],
  ])("is clear for %s", (_, rows, stripe) => {
    expect(planBilling(rows, stripe, NOW).duplicateBilling).toBe(false);
  });
});

describe("planBilling's Stripe facts (ADR 001 D15)", () => {
  it("says Stripe will bill again whenever a Stripe plan renews", () => {
    expect(planBilling([row()], STRIPE_RENEWS, NOW).stripeRenews).toBe(true);
    expect(planBilling([row()], STRIPE_ENDING, NOW).stripeRenews).toBe(false);
  });

  it("passes on when a waiting Stripe plan starts", () => {
    expect(
      planBilling([ending], { ...STRIPE_RENEWS, startsAt: LATER }, NOW)
        .stripeStartsAt,
    ).toEqual(LATER);
    expect(planBilling([], NO_STRIPE, NOW).stripeStartsAt).toBeNull();
  });
});

describe("planBilling store summary (ADR 001 D13)", () => {
  it("reports what the store plan is and how it stands", () => {
    expect(planBilling([row()], NO_STRIPE, NOW).store).toEqual({
      provider: StoreProvider.APP_STORE,
      productId: "io.beancount.growth.yearly",
      tier: SubscriptionTier.GROWTH,
      interval: "year",
      status: StoreSubscriptionStatus.ACTIVE,
      accessEndsAt: LATER,
      willRenew: true,
      scheduledChange: null,
      managementUrl: null,
    });
  });

  it("omits the store for an account with no live store plan", () => {
    expect(planBilling([expired], STRIPE_RENEWS, NOW).store).toBeNull();
  });

  it("prefers the renewing row over an ending one", () => {
    const newer = row({ productId: "io.beancount.premium.monthly" });
    expect(planBilling([ending, newer], NO_STRIPE, NOW).store?.productId).toBe(
      "io.beancount.premium.monthly",
    );
  });

  it("resolves a scheduled App Store change to its plan", () => {
    const moving = row({ pendingProductId: "io.beancount.premium.yearly" });
    expect(
      planBilling([moving], NO_STRIPE, NOW).store?.scheduledChange,
    ).toEqual({ tier: SubscriptionTier.PREMIUM, interval: "year" });
  });

  it("resolves a scheduled Google Play change with the row's base plan", () => {
    const moving = row({
      provider: StoreProvider.GOOGLE_PLAY,
      productId: "growth",
      basePlanId: "monthly",
      pendingProductId: "premium",
    });
    expect(
      planBilling([moving], NO_STRIPE, NOW).store?.scheduledChange,
    ).toEqual({ tier: SubscriptionTier.PREMIUM, interval: "month" });
  });

  it("does not invent a change for a product outside the catalog", () => {
    const moving = row({ pendingProductId: "io.beancount.retired" });
    expect(
      planBilling([moving], NO_STRIPE, NOW).store?.scheduledChange,
    ).toBeNull();
  });

  it("links Google Play's page for the plan, and nothing for Apple", () => {
    const google = row({
      provider: StoreProvider.GOOGLE_PLAY,
      productId: "growth",
      basePlanId: "monthly",
    });
    expect(planBilling([google], NO_STRIPE, NOW).store?.managementUrl).toBe(
      "https://play.google.com/store/account/subscriptions?sku=growth&package=io.beancount.android",
    );
    expect(
      planBilling([row()], NO_STRIPE, NOW).store?.managementUrl,
    ).toBeNull();
  });
});
