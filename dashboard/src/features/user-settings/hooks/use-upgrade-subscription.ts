import { useMutation } from "@apollo/client/react";
import {
  UpgradeSubscriptionDocument,
  type UpgradeSubscriptionMutation,
  type UpgradeSubscriptionMutationVariables,
  GetCurrentUserDocument,
  GetSubscriptionStatusDocument,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";

/**
 * Custom hook for upgrading an existing Stripe subscription in-place.
 * Uses stripe.subscriptions.update() on the backend instead of creating
 * a new checkout session, preventing duplicate subscriptions.
 *
 * After a successful upgrade, optimistically updates the Apollo cache with
 * the new tier so the UI reflects the change immediately, even if the
 * backend refetch returns stale data (Stripe webhook processing delay).
 *
 * @example
 * ```tsx
 * const { upgradeSubscription, loading } = useUpgradeSubscription();
 *
 * const handleUpgrade = async () => {
 *   const result = await upgradeSubscription({
 *     variables: {
 *       clientId: 'beancount-web-prod',
 *       priceId: 'price_123'
 *     }
 *   });
 *
 *   const data = result.data?.upgradeSubscription;
 *   if (data?.success) {
 *     // Upgrade succeeded
 *   } else if (data?.clientSecret) {
 *     // 3DS authentication required
 *   }
 * };
 * ```
 */
export const useUpgradeSubscription = () => {
  const [upgradeSubscription, { data, loading, error }] = useMutation<
    UpgradeSubscriptionMutation,
    UpgradeSubscriptionMutationVariables
  >(UpgradeSubscriptionDocument, {
    refetchQueries: [
      { query: GetCurrentUserDocument },
      { query: GetSubscriptionStatusDocument },
    ],
    awaitRefetchQueries: true,
    update(cache, { data: mutationData }) {
      const newTier = mutationData?.upgradeSubscription?.newTier;
      if (!mutationData?.upgradeSubscription?.success || !newTier) return;

      const existing = cache.readQuery<GetCurrentUserQuery>({
        query: GetCurrentUserDocument,
      });
      if (!existing?.userProfile) return;

      cache.writeQuery<GetCurrentUserQuery>({
        query: GetCurrentUserDocument,
        data: {
          userProfile: {
            ...existing.userProfile,
            tier: newTier,
          },
        },
      });
    },
  });

  return {
    upgradeSubscription,
    data,
    loading,
    error,
    result: data?.upgradeSubscription,
    success: data?.upgradeSubscription?.success,
    message: data?.upgradeSubscription?.message,
    clientSecret: data?.upgradeSubscription?.clientSecret,
  };
};
