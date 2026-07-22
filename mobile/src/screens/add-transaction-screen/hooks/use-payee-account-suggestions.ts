import { useMemo } from "react";
import {
  useGetLedgerPayeeAccountsQuery,
  useSuggestTransactionCategoriesWithLlmQuery,
} from "@/generated-graphql/graphql";
import {
  buildLlmTransaction,
  deriveSuggestions,
  type AccountSuggestion,
  type AccountTypes,
  type SideSuggestions,
  type SuggestionSource,
} from "@/common/suggestion-utils";

export interface UsePayeeAccountSuggestionsArgs {
  ledgerId: string;
  payee: string;
  amount: string;
  date: string;
  narration: string;
  /** Account-type prefixes used to split history into FROM vs TO accounts. */
  accountTypes: AccountTypes;
  /**
   * Whether to run the LLM fallback for unseen payees. Defaults to true. The
   * quick-add screen disables it (history-only there) so the expensive call
   * isn't duplicated — the review screen runs the full history + LLM flow.
   */
  enableLlm?: boolean;
}

export interface UsePayeeAccountSuggestionsResult {
  from: SideSuggestions;
  to: SideSuggestions;
  /** Active source, for analytics + accessibility. Null until resolved. */
  source: SuggestionSource | null;
  /** True while a relevant query is in flight and nothing to show yet. */
  loading: boolean;
}

/**
 * Given the selected payee on the add-transaction screen, fetch the accounts
 * the ledger has used with that payee and surface them as suggestions, split
 * into the funding (FROM) and expense (TO) sides. When the ledger has never
 * seen the payee, fall back to the LLM category suggester (TO chips only).
 * Slow or failed queries never block: callers get empty suggestions and the
 * flow proceeds exactly as before.
 */
export function usePayeeAccountSuggestions(
  args: UsePayeeAccountSuggestionsArgs,
): UsePayeeAccountSuggestionsResult {
  const {
    ledgerId,
    payee,
    amount,
    date,
    narration,
    accountTypes,
    enableLlm = true,
  } = args;
  const hasPayee = payee.trim().length > 0;

  // History query — always fetched (network-only) when a payee is selected so a
  // re-pick re-fetches fresh data rather than showing stale cache. The op
  // returns BOTH legs of past transactions (funding + expense); we classify
  // them by type prefix downstream so each fills the right side.
  const historyRes = useGetLedgerPayeeAccountsQuery({
    variables: { ledgerId, payee },
    skip: !hasPayee || !ledgerId,
    fetchPolicy: "network-only",
  });

  const historyAccounts = historyRes.data?.getLedgerPayeeAccounts ?? [];
  const historyEmpty =
    hasPayee && ledgerId
      ? !historyRes.loading && historyAccounts.length === 0
      : false;

  const transaction = useMemo(
    () => buildLlmTransaction({ amount, date, payee, narration }),
    [amount, date, payee, narration],
  );

  // LLM fallback — only fires once we know the payee is unseen. Skipping while
  // history is still loading avoids a redundant call for repeat payees.
  const llmRes = useSuggestTransactionCategoriesWithLlmQuery({
    variables: { ledgerId, transactions: [transaction] },
    skip: !enableLlm || !historyEmpty || !ledgerId,
    fetchPolicy: "network-only",
  });

  const llmSuggestions = llmRes.data?.suggestTransactionCategoriesWithLLM ?? [];

  return deriveSuggestions({
    payee,
    historyAccounts,
    llmSuggestions,
    accountTypes,
    historyLoading: historyRes.loading,
    llmLoading: llmRes.loading,
  });
}

// Re-export the value module's types for callers that build chips by hand.
export type { AccountSuggestion, AccountTypes, SideSuggestions };
