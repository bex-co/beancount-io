import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import {
  deriveTwoPostingSuggestions,
  type JournalEntryLike,
  type SideSuggestions,
} from "@/common/suggestion-utils";

export interface UseTwoPostingSuggestionsArgs {
  ledgerId: string;
  payee: string;
}

export interface UseTwoPostingSuggestionsResult {
  from: SideSuggestions;
  to: SideSuggestions;
  /** True while the journal query is in flight and nothing to show yet. */
  loading: boolean;
}

/**
 * Quick-add suggestion source. Reads the payee's transactions from the journal
 * and derives FROM/TO only from its two-posting (simple) transactions, ignoring
 * multi-leg splits — matching quick-add's own FROM→TO model. Slow or failed
 * queries never block: callers get empty sides and the flow proceeds as before.
 *
 * `query.filter` narrows server-side by text search; `deriveTwoPostingSuggestions`
 * then exact-matches `payee` client-side so only this payee's transactions count.
 */
export function useTwoPostingSuggestions(
  args: UseTwoPostingSuggestionsArgs,
): UseTwoPostingSuggestionsResult {
  const { ledgerId, payee } = args;
  const hasPayee = payee.trim().length > 0;

  const { data, loading } = useGetLedgerJournalQuery({
    variables: { ledgerId, query: { filter: payee, limit: 50 } },
    skip: !hasPayee || !ledgerId,
    fetchPolicy: "network-only",
  });

  const entries = (data?.getLedgerJournal?.data ??
    []) as unknown as JournalEntryLike[];
  const { from, to } = deriveTwoPostingSuggestions(entries, payee);

  return { from, to, loading: hasPayee ? loading : false };
}
