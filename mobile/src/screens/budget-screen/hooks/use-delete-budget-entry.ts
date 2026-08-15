import { useCallback, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  GetLedgerEntryContextDocument,
  useDeleteLedgerEntrySourceSliceMutation,
  type GetLedgerEntryContextQuery,
  type GetLedgerEntryContextQueryVariables,
} from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { type BudgetMutationResult } from "@/screens/budget-screen/hooks/use-budget-groups";

/**
 * Deleting a budget entry removes its source slice from the ledger file, which
 * the server guards with an optimistic lock: we read the entry's current
 * `sha256sum` and hand it back with the delete, so a file that changed
 * underneath us fails instead of clobbering someone else's edit.
 */
export function useDeleteBudgetEntry(ledgerId: string) {
  const client = useApolloClient();
  const [deleteSlice] = useDeleteLedgerEntrySourceSliceMutation();
  const [deleting, setDeleting] = useState(false);

  const deleteBudgetEntry = useCallback(
    async (entryHash: string): Promise<BudgetMutationResult> => {
      setDeleting(true);
      try {
        const { data: context } = await client.query<
          GetLedgerEntryContextQuery,
          GetLedgerEntryContextQueryVariables
        >({
          query: GetLedgerEntryContextDocument,
          variables: { entryHash, ledgerId },
          fetchPolicy: "network-only",
        });

        const sha256sum = context?.getLedgerEntryContext?.sha256sum;
        if (!sha256sum) {
          // The dashboard returns silently here, which reads as "nothing
          // happened" to the user. Surface it instead.
          return { ok: false, message: null };
        }

        await deleteSlice({
          variables: { ledgerId, input: { entryHash, sha256sum } },
        });

        await invalidateLedgerData(client, "entries");
        return { ok: true };
      } catch (caught) {
        return {
          ok: false,
          message: caught instanceof Error ? caught.message : null,
        };
      } finally {
        setDeleting(false);
      }
    },
    [client, deleteSlice, ledgerId],
  );

  return { deleteBudgetEntry, deleting };
}
