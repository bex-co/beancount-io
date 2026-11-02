import type { SubscriptionStatusQuery } from "@/generated-graphql/graphql";
import { BillingSource } from "../../generated-graphql/types";

const PLAN_KEYS: Readonly<Record<string, string>> = {
  FREE: "planFree",
  PREMIUM: "planPremium",
  GROWTH: "planGrowth",
  ORGANIZATION: "planOrganization",
  ENTERPRISE: "planEnterprise",
};

export const planKey = (tier: string | null | undefined) =>
  (tier && PLAN_KEYS[tier]) ?? PLAN_KEYS.FREE;

const cycleKey = (interval: string | null | undefined) => {
  if (interval === "year") return "planYearly";
  return interval === "month" ? "planMonthly" : null;
};

export type PlanPlatform = "ios" | "android";

export interface PlanCardStatus {
  key: string;
  /** As the API sends it; the screen formats it for the locale. */
  date: unknown;
  /** The plan a scheduled change moves to, as a translation key. */
  planKey?: string;
}

/**
 * What the plan card says (ADR 001 D14). Every line is plain text: the apps
 * carry no link, button, or instruction to buy or manage outside the store.
 */
export interface PlanCard {
  planKey: string;
  cycleKey: string | null;
  status: PlanCardStatus | null;
  sourceKey: string | null;
  /** Set when another platform's device manages this plan. */
  managedOnKey: string | null;
}

type StatusData = SubscriptionStatusQuery["subscriptionStatus"];
type StorePlan = NonNullable<StatusData["billing"]["store"]>;
type StripePlan = StatusData["subscriptions"][number];

function storeStatus(store: StorePlan): PlanCardStatus | null {
  const date = store.accessEndsAt;
  if (!date) return null;
  if (!store.willRenew) return { key: "planEndsOn", date };
  if (!store.scheduledChange) return { key: "planRenewsOn", date };
  return {
    key: "planChangesToOn",
    date,
    planKey: planKey(store.scheduledChange.tier),
  };
}

function stripeStatus(plan: StripePlan): PlanCardStatus | null {
  if (plan.cancelAt) return { key: "planEndsOn", date: plan.cancelAt };
  if (plan.cancelAtPeriodEnd) {
    return { key: "planEndsOn", date: plan.currentPeriodEnd };
  }
  if (plan.scheduledChange) {
    return { key: "planChangesOn", date: plan.scheduledChange.effectiveAt };
  }
  return { key: "planRenewsOn", date: plan.currentPeriodEnd };
}

function storeCard(
  tier: string,
  store: StorePlan,
  platform: PlanPlatform,
): PlanCard {
  const onAppStore = store.provider === BillingSource.AppStore;
  const home: PlanPlatform = onAppStore ? "ios" : "android";
  return {
    planKey: planKey(store.tier ?? tier),
    cycleKey: cycleKey(store.interval),
    status: storeStatus(store),
    sourceKey: onAppStore ? "planBilledByAppStore" : "planBilledByGooglePlay",
    managedOnKey:
      platform === home
        ? null
        : onAppStore
          ? "planManagedOnIos"
          : "planManagedOnAndroid",
  };
}

export function planCard(
  tier: string,
  data: StatusData,
  platform: PlanPlatform,
): PlanCard {
  const { source, store } = data.billing;
  const billedByStore =
    source === BillingSource.AppStore || source === BillingSource.GooglePlay;
  if (billedByStore && store) return storeCard(tier, store, platform);

  const plain = {
    planKey: planKey(tier),
    cycleKey: null,
    status: null,
    sourceKey: null,
    managedOnKey: null,
  };
  // Enterprise is arranged by hand, so it has nothing here to describe.
  if (source !== BillingSource.Stripe || tier === "ENTERPRISE") return plain;

  const stripe = data.subscriptions[0];
  return {
    ...plain,
    cycleKey: cycleKey(stripe?.items[0]?.price.interval),
    status: stripe ? stripeStatus(stripe) : null,
    sourceKey: "planBilledByStripe",
  };
}
