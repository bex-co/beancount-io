import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import {
  ExchangePlaidPublicTokenDocument,
  GetPlaidItemsDocument,
  type ExchangePlaidPublicTokenMutation,
  type ExchangePlaidPublicTokenMutationVariables,
} from "@/graphql/definitions";

/**
 * Hook for exchanging Plaid public token for access token
 * Automatically refetches Plaid items after successful exchange
 */
export function usePlaidTokenExchange() {
  const [error, setError] = useState<Error | null>(null);

  const [exchangePublicTokenMutation, { loading }] = useMutation<
    ExchangePlaidPublicTokenMutation,
    ExchangePlaidPublicTokenMutationVariables
  >(ExchangePlaidPublicTokenDocument, {
    refetchQueries: [GetPlaidItemsDocument],
    onCompleted: () => {
      setError(null);
    },
    onError: (err) => {
      console.error("Failed to exchange public token:", err);
      setError(err);
    },
  });

  const exchangePublicToken = useCallback(
    async (ledgerId: string, publicToken: string) => {
      setError(null);
      await exchangePublicTokenMutation({
        variables: { ledgerId, publicToken },
      });
    },
    [exchangePublicTokenMutation],
  );

  return {
    exchangePublicToken,
    loading,
    error,
  };
}
