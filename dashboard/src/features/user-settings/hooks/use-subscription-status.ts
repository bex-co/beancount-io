import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";
import { useBillingDateFormat } from "@/features/user-settings/pages/general/use-money-format";

/** Who bills the plan, as the Billing tab reads it. */
export type PlanBillingStatus = NonNullable<
  GetSubscriptionStatusQuery["subscriptionStatus"]["billing"]
>;

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
  };
};
