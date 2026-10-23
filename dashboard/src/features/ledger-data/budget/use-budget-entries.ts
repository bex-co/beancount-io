import { useEffect, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import type { BudgetEntry } from "./types";

const BUDGET_PAGE_SIZE = 100;

/** One page of the ledger's budget directives, newest first. */
export function budgetJournalVariables(ledgerId: string, offset = 0) {
  return {
    ledgerId,
    query: {
      directiveTypes: ["Custom"],
      customSubtypes: ["budget"],
      limit: BUDGET_PAGE_SIZE,
      offset,
    },
  };
}

type Page = { total: number; data: unknown[] };

/**
 * Every budget directive in the ledger. The journal is paginated, and a
 * Budget page built from its first page alone silently lost accounts and
 * older targets (w4/235). The first page stays a watched query, so mutation
 * refetches and cache clears still refresh it; the rest are read after it
 * whenever `total` says more exist. Until all are in, the result is loading;
 * a failed later page is an error with a retry, never a partial comparison.
 */
export function useBudgetEntries(ledgerId: string) {
  const client = useApolloClient();
  const first = useQuery(GetLedgerJournalDocument, {
    variables: budgetJournalVariables(ledgerId),
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });
  const firstPage = first.data?.getLedgerJournal as Page | undefined;
  const needsMore = !!firstPage && firstPage.data.length < firstPage.total;

  const [attempt, setAttempt] = useState(0);
  const [rest, setRest] = useState<{
    after: Page;
    data: unknown[];
    error?: Error;
  } | null>(null);

  useEffect(() => {
    if (!firstPage || !needsMore) return;
    let cancelled = false;
    void (async () => {
      const data: unknown[] = [];
      try {
        for (
          let offset = firstPage.data.length;
          offset < firstPage.total;
          offset += BUDGET_PAGE_SIZE
        ) {
          const result = await client.query({
            query: GetLedgerJournalDocument,
            variables: budgetJournalVariables(ledgerId, offset),
            fetchPolicy: "network-only",
          });
          const page = (result.data?.getLedgerJournal?.data ?? []) as unknown[];
          if (page.length === 0) throw new Error("Budget history ended early");
          data.push(...page);
        }
        if (!cancelled) setRest({ after: firstPage, data });
      } catch (error) {
        if (!cancelled) {
          setRest({ after: firstPage, data: [], error: error as Error });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, ledgerId, firstPage, needsMore, attempt]);

  const restForPage = rest?.after === firstPage ? rest : null;
  const complete =
    !!firstPage && (!needsMore || (!!restForPage && !restForPage.error));
  const error = first.error ?? restForPage?.error;

  return {
    entries: complete
      ? ([...firstPage.data, ...(restForPage?.data ?? [])] as BudgetEntry[])
      : null,
    loading: !error && (first.loading || (!!firstPage && !complete)),
    error,
    // A first-page retry returns its read, so the error view stays, busy,
    // until it settles (w4/983).
    retry: () => {
      if (first.error) return first.refetch();
      setAttempt((current) => current + 1);
    },
  };
}
