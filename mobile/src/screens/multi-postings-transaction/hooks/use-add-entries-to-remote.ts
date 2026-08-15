import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { useAddEntriesMutation } from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";

/**
 * Writes new directives to the ledger and invalidates everything derived from
 * it. The invalidation lives here rather than at the call sites so both entry
 * points — the quick-add flow and the multi-leg screen — inherit it.
 *
 * `AddTransactionCallback` still runs on top of this: it navigates back to the
 * screen that opened the add flow. It used to be the *only* thing refreshing
 * anything, which meant a transaction added from Home left Accounts, Reports
 * and the budget cards showing pre-write numbers — all of them mounted, one
 * tab-tap away.
 */
export const useAddEntriesToRemote = () => {
  const client = useApolloClient();
  const [mutate, { error, data }] = useAddEntriesMutation();

  const mutateAndInvalidate = useCallback<typeof mutate>(
    async (options) => {
      const result = await mutate(options);
      // Only on a real write. `addEntries` reports rejection in the payload,
      // not by throwing.
      if (result.data?.addEntries?.success) {
        void invalidateLedgerData(client, "entries");
      }
      return result;
    },
    [client, mutate],
  );

  return { error, mutate: mutateAndInvalidate, data };
};
