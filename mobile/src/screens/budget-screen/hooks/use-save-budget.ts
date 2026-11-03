import { useCallback, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { useBulkEntriesMutation } from "@/generated-graphql/graphql";
import { useEntryWrite } from "@/common/entry-write";
import { createSingleFlight } from "@/common/single-flight";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { i18n } from "@/translations";
import {
  buildBudgetEntry,
  type BudgetEntryInput,
} from "@/screens/budget-screen/build-budget-entry";
import { type BudgetMutationResult } from "@/screens/budget-screen/hooks/use-budget-groups";

export function useSaveBudget(ledgerId: string) {
  const client = useApolloClient();
  const [bulkEntries] = useBulkEntriesMutation();
  const entryWrite = useEntryWrite();
  // Busy for the whole save, the refresh after the write included. The
  // mutation's own `loading` ends before that refresh, and for that window
  // Done was live again: a second tap wrote the budget twice and popped the
  // Budget screen too (w21/193).
  const [loading, setLoading] = useState(false);
  const flight = useRef(createSingleFlight(setLoading)).current;

  const saveBudget = useCallback(
    // `null`: a save was already running, so this press did nothing.
    (input: BudgetEntryInput): Promise<BudgetMutationResult | null> =>
      saveOnce(flight, async (): Promise<BudgetMutationResult> => {
        try {
          const { data } = await entryWrite.send(() =>
            bulkEntries({
              variables: entryWrite.withRequestId({
                ledgerId,
                entries: [buildBudgetEntry(input)],
              }),
            }),
          );

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
            message: ledgerWriteFailureMessage(caught, i18n),
          };
        }
      }),
    [bulkEntries, entryWrite, client, ledgerId, flight],
  );

  return { saveBudget, loading };
}

/** `write` unless one is already running, resolving to `null` in that case. */
async function saveOnce<T>(
  flight: ReturnType<typeof createSingleFlight>,
  write: () => Promise<T>,
): Promise<T | null> {
  return (await flight.run(write)) ?? null;
}
