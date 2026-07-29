import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import {
  CreatePlaidUpdateModeLinkTokenDocument,
  type CreatePlaidUpdateModeLinkTokenMutation,
  type CreatePlaidUpdateModeLinkTokenMutationVariables,
} from "@/graphql/definitions";

/**
 * Hook for lazily creating a Plaid link token in update mode for reauthentication
 * Only creates token when explicitly requested (no auto-creation on mount)
 */
export function usePlaidUpdateModeLinkToken() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [createUpdateModeLinkTokenMutation, { loading }] = useMutation<
    CreatePlaidUpdateModeLinkTokenMutation,
    CreatePlaidUpdateModeLinkTokenMutationVariables
  >(CreatePlaidUpdateModeLinkTokenDocument, {
    onCompleted: (data) => {
      setLinkToken(data.createPlaidUpdateModeLinkToken.linkToken);
      setError(null);
    },
    onError: (err) => {
      console.error("Failed to create update mode link token:", err);
      setError(err);
      setLinkToken(null);
    },
  });

  const createUpdateModeLinkToken = useCallback(
    async (ledgerId: string, itemId: string, accountSelection?: boolean) => {
      // Reset error state before creating
      setError(null);
      await createUpdateModeLinkTokenMutation({
        variables: { itemId, ledgerId, accountSelection },
      });
    },
    [createUpdateModeLinkTokenMutation],
  );

  const reset = useCallback(() => {
    setLinkToken(null);
    setError(null);
  }, []);

  return {
    linkToken,
    createUpdateModeLinkToken,
    loading,
    error,
    reset,
  };
}
