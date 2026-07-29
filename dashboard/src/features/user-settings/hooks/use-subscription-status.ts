import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";

export const useSubscriptionStatus = () => {
  const { data, loading, error, refetch } =
    useQuery<GetSubscriptionStatusQuery>(GetSubscriptionStatusDocument);

  const hasActiveStripeSubscription =
    data?.subscriptionStatus?.hasActiveSubscription ?? false;

  const renewalDate = useMemo(() => {
    if (!hasActiveStripeSubscription) return null;
    const sub = data?.subscriptionStatus?.subscriptions?.[0];
    if (!sub?.currentPeriodEnd || sub.cancelAt || sub.canceledAt) return null;
    return new Date(sub.currentPeriodEnd).toLocaleDateString();
  }, [data, hasActiveStripeSubscription]);

  return {
    loading,
    error,
    refetch,
    hasActiveStripeSubscription,
    renewalDate,
    subscriptions: data?.subscriptionStatus?.subscriptions,
  };
};
