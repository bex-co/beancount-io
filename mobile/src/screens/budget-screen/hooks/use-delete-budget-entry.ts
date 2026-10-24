import { i18n } from "@/translations";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { useCallback, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  GetLedgerEntryContextDocument,
  useDeleteLedgerEntrySourceSliceMutation,
  type GetLedgerEntryContextQuery,
  type GetLedgerEntryContextQueryVariables,
} from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { classifyStaleDelete } from "@/screens/transaction-detail-screen/delete-transaction";
import { type BudgetMutationResult } from "@/screens/budget-screen/hooks/use-budget-groups";

/**
 * Deleting a budget entry removes its source slice from the ledger file, which
 * the server guards with an optimistic lock: we read the entry's current
 * `sha256sum` and hand it back with the delete, so a file that changed
 * underneath us fails instead of clobbering someone else's edit.
 */
export function useDeleteBudgetEntry(ledgerId: string) {
  const client = useApolloClient();
  const { canWrite } = useLedgerAccess();
  const [deleteSlice] = useDeleteLedgerEntrySourceSliceMutation();
  const [deleting, setDeleting] = useState(false);

  const deleteBudgetEntry = useCallback(
    async (entryHash: string): Promise<BudgetMutationResult> => {
      // Unresolved permissions read as read-only: `canWrite` is false until
      // this ledger's permissions come back, so a reader (or a session that
      // has not answered yet) never reaches the entry-context query or the
      // slice mutation.
      if (!canWrite) {
        return { ok: false, message: null };
      }
      setDeleting(true);
      // Once the delete is on its way a lost answer is unconfirmed; before that
      // nothing was deleted (w21/935).
      let sent = false;
      try {
        const { data: context } = await client.query<
          GetLedgerEntryContextQuery,
          GetLedgerEntryContextQueryVariables
        >({
          query: GetLedgerEntryContextDocument,
          variables: { entryHash, ledgerId },
          // network-only: delete needs a fresh sha256sum lock, not a cached one.
          fetchPolicy: "network-only",
        });

        const sha256sum = context?.getLedgerEntryContext?.sha256sum;
        if (!sha256sum) {
          // The dashboard returns silently here, which reads as "nothing
          // happened" to the user. Surface it instead.
          return { ok: false, message: null };
        }

        sent = true;
        await deleteSlice({
          variables: { ledgerId, input: { entryHash, sha256sum } },
        });

        await invalidateLedgerData(client, "entries");
        return { ok: true };
      } catch (caught) {
        // The entry changed or was removed elsewhere, so its hash no longer
        // resolves (or the slice moved): every retry would fail the same way.
        // Refresh the history and say so (w21/393, as w21/250 for a
        // transaction).
        if (classifyStaleDelete(caught) !== null) {
          await invalidateLedgerData(client, "entries");
          return { ok: false, message: i18n.t("budgetDeleteChanged") };
        }
        return {
          ok: false,
          // In the user's language, not the transport's (w21/117).
          message: ledgerWriteFailureMessage(
            caught,
            i18n,
            undefined,
            sent ? "delete" : "delete-unsent",
          ),
        };
      } finally {
        setDeleting(false);
      }
    },
    [canWrite, client, deleteSlice, ledgerId],
  );

  return { deleteBudgetEntry, deleting };
}
