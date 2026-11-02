import fs from "fs";
import path from "path";
import type { SubscriptionStatusQuery } from "@/generated-graphql/graphql";
import { BillingSource } from "../../../generated-graphql/types";
import { planCard } from "../plan-card";

type Data = SubscriptionStatusQuery["subscriptionStatus"];
type Store = NonNullable<Data["billing"]["store"]>;

const END = "2026-12-01T12:00:00.000Z";
const { AppStore, GooglePlay, None, Stripe } = BillingSource;

const store = (overrides: Partial<Store> = {}): Store =>
  ({
    provider: AppStore,
    tier: "GROWTH",
    interval: "year",
    accessEndsAt: END,
    willRenew: true,
    scheduledChange: null,
    ...overrides,
  }) as Store;

const stripe = (overrides: Record<string, unknown> = {}) =>
  ({
    cancelAt: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: END,
    scheduledChange: null,
    items: [{ price: { interval: "month" } }],
    ...overrides,
  }) as Data["subscriptions"][number];

const status = (
  source: BillingSource,
  plan: Store | null = null,
  subscriptions: Data["subscriptions"] = [],
) =>
  ({
    hasActiveSubscription: subscriptions.length > 0,
    subscriptions,
    billing: { source, store: plan },
  }) as Data;

describe("planCard (ADR 001 D14)", () => {
  it("shows a free account its plan and nothing else", () => {
    expect(planCard("FREE", status(None), "ios")).toEqual({
      planKey: "planFree",
      cycleKey: null,
      status: null,
      sourceKey: null,
      managedOnKey: null,
    });
  });

  it("shows a Stripe plan read-only", () => {
    expect(
      planCard("PREMIUM", status(Stripe, null, [stripe()]), "ios"),
    ).toEqual({
      planKey: "planPremium",
      cycleKey: "planMonthly",
      status: { key: "planRenewsOn", date: END },
      sourceKey: "planBilledByStripe",
      managedOnKey: null,
    });
  });

  it("says when a Stripe plan set to end at the period's end ends", () => {
    const ending = stripe({ cancelAtPeriodEnd: true });

    expect(
      planCard("PREMIUM", status(Stripe, null, [ending]), "ios").status,
    ).toEqual({ key: "planEndsOn", date: END });
  });

  it("says when a Stripe plan set to end on a date ends", () => {
    const date = "2026-11-15T00:00:00Z";
    const ending = stripe({ cancelAt: date });

    expect(
      planCard("PREMIUM", status(Stripe, null, [ending]), "ios").status,
    ).toEqual({ key: "planEndsOn", date });
  });

  it("says when a Stripe plan changes", () => {
    const changing = stripe({ scheduledChange: { effectiveAt: END } });

    expect(
      planCard("GROWTH", status(Stripe, null, [changing]), "ios").status,
    ).toEqual({ key: "planChangesOn", date: END });
  });

  it("describes a store plan on its own platform", () => {
    expect(planCard("GROWTH", status(AppStore, store()), "ios")).toEqual({
      planKey: "planGrowth",
      cycleKey: "planYearly",
      status: { key: "planRenewsOn", date: END },
      sourceKey: "planBilledByAppStore",
      managedOnKey: null,
    });
  });

  it("tells an App Store subscriber on Android which device manages it", () => {
    const card = planCard("GROWTH", status(AppStore, store()), "android");

    expect(card.sourceKey).toBe("planBilledByAppStore");
    expect(card.managedOnKey).toBe("planManagedOnIos");
  });

  it("tells a Google Play subscriber on iOS which device manages it", () => {
    const plan = store({ provider: GooglePlay });
    const card = planCard("GROWTH", status(GooglePlay, plan), "ios");

    expect(card.sourceKey).toBe("planBilledByGooglePlay");
    expect(card.managedOnKey).toBe("planManagedOnAndroid");
  });

  it("does not point a Google Play subscriber on Android at another device", () => {
    const plan = store({ provider: GooglePlay });

    expect(
      planCard("GROWTH", status(GooglePlay, plan), "android").managedOnKey,
    ).toBe(null);
  });

  it("says a store plan is ending", () => {
    const plan = store({ willRenew: false });

    expect(planCard("GROWTH", status(AppStore, plan), "ios").status).toEqual({
      key: "planEndsOn",
      date: END,
    });
  });

  it("names the plan a store change moves to", () => {
    const plan = store({
      scheduledChange: { tier: "PREMIUM" } as Store["scheduledChange"],
    });

    expect(planCard("GROWTH", status(AppStore, plan), "ios").status).toEqual({
      key: "planChangesToOn",
      date: END,
      planKey: "planPremium",
    });
  });

  it("invents no date a store has not reported", () => {
    const plan = store({ accessEndsAt: null });

    expect(planCard("GROWTH", status(AppStore, plan), "ios").status).toBe(null);
  });

  it("follows Stripe while a store plan ends beside it", () => {
    const ending = store({ willRenew: false });

    expect(
      planCard("GROWTH", status(Stripe, ending, [stripe()]), "ios").sourceKey,
    ).toBe("planBilledByStripe");
  });

  it("describes nothing about an Enterprise arrangement", () => {
    const card = planCard(
      "ENTERPRISE",
      status(Stripe, null, [stripe()]),
      "ios",
    );

    expect(card.planKey).toBe("planEnterprise");
    expect(card.sourceKey).toBe(null);
    expect(card.status).toBe(null);
  });
});

describe("the plan screen", () => {
  it("offers nothing to tap: the apps link nowhere outside the store", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "plan-screen.tsx"),
      "utf8",
    );

    expect(/Linking|WebBrowser|openURL|Pressable|onPress/.test(source)).toBe(
      false,
    );
  });
});
