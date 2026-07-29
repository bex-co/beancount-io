import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import {
  CreatePlaidLinkTokenDocument,
  type CreatePlaidLinkTokenMutation,
  type CreatePlaidLinkTokenMutationVariables,
} from "@/graphql/definitions";

/**
 * Hook for lazily creating a Plaid link token
 * Only creates token when explicitly requested (no auto-creation on mount)
 */
export function usePlaidLinkToken() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [createLinkTokenMutation, { loading }] = useMutation<
    CreatePlaidLinkTokenMutation,
    CreatePlaidLinkTokenMutationVariables
  >(CreatePlaidLinkTokenDocument, {
    onCompleted: (data) => {
      setLinkToken(data.createPlaidLinkToken.linkToken);
      setError(null);
    },
    onError: (err) => {
      console.error("Failed to create link token:", err);
      setError(err);
      setLinkToken(null);
    },
  });

  const createLinkToken = useCallback(
    async (ledgerId: string) => {
      // Reset error state before creating
      setError(null);
      await createLinkTokenMutation({ variables: { ledgerId } });
    },
    [createLinkTokenMutation],
  );

  const reset = useCallback(() => {
    setLinkToken(null);
    setError(null);
  }, []);

  return {
    linkToken,
    createLinkToken,
    loading,
    error,
    reset,
  };
}
