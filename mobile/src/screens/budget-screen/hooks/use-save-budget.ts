import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { useBulkEntriesMutation } from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import {
  buildBudgetEntry,
  type BudgetEntryInput,
} from "@/screens/budget-screen/build-budget-entry";
import { type BudgetMutationResult } from "@/screens/budget-screen/hooks/use-budget-groups";

export function useSaveBudget(ledgerId: string) {
  const client = useApolloClient();
  const [bulkEntries, { loading }] = useBulkEntriesMutation();

  const saveBudget = useCallback(
    async (input: BudgetEntryInput): Promise<BudgetMutationResult> => {
      try {
        const { data } = await bulkEntries({
          variables: { ledgerId, entries: [buildBudgetEntry(input)] },
        });

        if (data?.bulkEntries.success) {
          // A budget directive is a ledger write like any other: the journal,
          // interval totals, the error badge and the commit history all move.
          // Awaited so the list the caller returns to is already correct.
          await invalidateLedgerData(client, "entries");
          return { ok: true };
        }

        return {
          ok: false,
          message: data?.bulkEntries.message?.trim() || null,
        };
      } catch (caught) {
        return {
          ok: false,
          message: caught instanceof Error ? caught.message : null,
        };
      }
    },
    [bulkEntries, client, ledgerId],
  );

  return { saveBudget, loading };
}
