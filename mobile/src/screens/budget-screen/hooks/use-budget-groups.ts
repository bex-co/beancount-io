import { useEffect, useMemo } from "react";
import type { ApolloClient } from "@apollo/client";
import {
  GetLedgerJournalDocument,
  useGetLedgerJournalQuery,
} from "@/generated-graphql/graphql";
import { DirectiveType } from "@/screens/transactions-screen/types";
import {
  groupBudgetEntries,
  type BudgetEntry,
} from "@/screens/budget-screen/selectors/budget-selectors";

/**
 * Budget directives are read through the generic journal query, filtered to
 * `custom "budget"`. The server's default page size is 20 and it truncates
 * silently, so we ask for a page big enough to cover any realistic budget set
 * (the dashboard omits the limit and quietly loses budgets past the 20th).
 *
 * TODO: past this many directives the list still truncates silently. The
 * response carries `total`, and `transactions-screen` already pages a journal
 * query with `fetchMore` — page to completion here rather than raising the cap.
 */
export const BUDGET_DIRECTIVE_LIMIT = 500;

const BUDGET_QUERY = {
  offset: 0,
  limit: BUDGET_DIRECTIVE_LIMIT,
  directiveTypes: [DirectiveType.CUSTOM],
  customSubtypes: ["budget"],
};

/** Shared variables so the page and the home panel hit the same cache entry. */
export function budgetJournalVariables(ledgerId: string) {
  return { ledgerId, query: BUDGET_QUERY };
}

export function useBudgetGroups(ledgerId?: string, refreshSignal = 0) {
  const { data, loading, error, refetch } = useGetLedgerJournalQuery({
    variables: budgetJournalVariables(ledgerId!),
    skip: !ledgerId,
    // Budget directives change rarely, and this query now runs on every Home
    // mount for the panel. `refreshSignal` and pull-to-refresh still force a
    // network read when the user asks for one.
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (refreshSignal > 0 && ledgerId) {
      refetch();
    }
  }, [refreshSignal, ledgerId, refetch]);

  const groups = useMemo(
    () =>
      groupBudgetEntries(
        (data?.getLedgerJournal.data ?? []) as unknown as BudgetEntry[],
      ),
    [data],
  );

  return { groups, loading, error, refetch };
}

/**
 * Outcome of a budget write. Shared by the save and delete hooks so both
 * report failure the same way and their callers can handle one shape.
 */
export type BudgetMutationResult =
  { ok: true } | { ok: false; message: string | null };

/**
 * Re-read the budget directives after a write. Targets this query's own
 * variables rather than every active journal query — the transactions list and
 * spending card share the operation but not this data.
 */
export async function refetchBudgetJournal(
  client: ApolloClient<unknown>,
  ledgerId: string,
): Promise<void> {
  try {
    await client.query({
      query: GetLedgerJournalDocument,
      variables: budgetJournalVariables(ledgerId),
      fetchPolicy: "network-only",
    });
  } catch {
    // The directive is already written; pull-to-refresh reconciles the view.
    // Reporting this as a write failure would invite a duplicate.
  }
}
