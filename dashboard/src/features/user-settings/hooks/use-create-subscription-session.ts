import { useMutation } from "@apollo/client/react";
import {
  CreateSubscriptionSessionDocument,
  type CreateSubscriptionSessionMutation,
  type CreateSubscriptionSessionMutationVariables,
} from "@/graphql/definitions";

/**
 * Custom hook for creating a Stripe subscription checkout session
 *
 * @example
 * ```tsx
 * const { createSubscriptionSession, loading, sessionUrl, success } = useCreateSubscriptionSession();
 *
 * const handleCheckout = async () => {
 *   const result = await createSubscriptionSession({
 *     variables: {
 *       clientId: 'beancount-web-prod',
 *       priceId: 'price_123'
 *     }
 *   });
 *
 *   if (result.data?.createSubscriptionSession?.sessionUrl) {
 *     window.location.href = result.data.createSubscriptionSession.sessionUrl;
 *   }
 * };
 * ```
 */
export const useCreateSubscriptionSession = () => {
  const [createSubscriptionSession, { data, loading, error }] = useMutation<
    CreateSubscriptionSessionMutation,
    CreateSubscriptionSessionMutationVariables
  >(CreateSubscriptionSessionDocument);

  return {
    createSubscriptionSession,
    data,
    loading,
    error,
    result: data?.createSubscriptionSession,
    success: data?.createSubscriptionSession?.success,
    sessionUrl: data?.createSubscriptionSession?.sessionUrl,
    message: data?.createSubscriptionSession?.message,
  };
};
