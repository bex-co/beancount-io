import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  BillingSource,
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";
import { useBillingDateFormat } from "@/features/user-settings/pages/general/use-money-format";

/** Who bills the plan, as the Billing tab reads it. */
export type PlanBillingStatus = NonNullable<
  GetSubscriptionStatusQuery["subscriptionStatus"]["billing"]
>;

/** Just what the billing predicates read, from either status document. */
type BillingFacts = {
  source: BillingSource;
  store?: { willRenew: boolean } | null;
} | null;

/** Whether a store bills this plan, renewing or running out. */
export const isStoreSource = (billing: BillingFacts) =>
  billing?.source === BillingSource.AppStore ||
  billing?.source === BillingSource.GooglePlay;

/**
 * Whether a store renews this plan, so Stripe has nothing to sell over it. With
 * renewal off the account may switch to Stripe (ADR 001 D15).
 */
export const isBilledByStore = (billing: BillingFacts) =>
  isStoreSource(billing) && Boolean(billing?.store?.willRenew);

export const useSubscriptionStatus = () => {
  const { data, loading, error, refetch } =
    useQuery<GetSubscriptionStatusQuery>(GetSubscriptionStatusDocument);

  const hasActiveStripeSubscription =
    data?.subscriptionStatus?.hasActiveSubscription ?? false;

  const formatDate = useBillingDateFormat();
  const renewalDate = useMemo(() => {
    if (!hasActiveStripeSubscription) return null;
    const sub = data?.subscriptionStatus?.subscriptions?.[0];
    if (!sub?.currentPeriodEnd || sub.cancelAt || sub.canceledAt) return null;
    return formatDate(sub.currentPeriodEnd);
  }, [data, hasActiveStripeSubscription, formatDate]);

  return {
    loading,
    error,
    refetch,
    hasActiveStripeSubscription,
    renewalDate,
    subscriptions: data?.subscriptionStatus?.subscriptions,
    planBilling: data?.subscriptionStatus?.billing ?? null,
    // A Stripe plan bought beside a store plan, waiting for it to end.
    hasDeferredSubscription: Boolean(
      data?.subscriptionStatus?.billing?.stripeStartsAt,
    ),
  };
};
