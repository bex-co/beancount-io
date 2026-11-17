import { DirectiveType } from "@/common/types/journal";

/**
 * The newest transactions under the dashboard's filters. Recent activity and
 * the page's own "data through" date read the same list, so they share one
 * request, which the route loader also starts, so the first render already
 * knows where the ledger's data ends.
 */
export function recentTransactionsVariables({
  ledgerId,
  account,
  filter,
  time,
}: {
  ledgerId: string;
  account: string;
  filter: string;
  time: string;
}) {
  return {
    ledgerId,
    query: {
      account: account || undefined,
      filter: filter || undefined,
      time: time || undefined,
      directiveTypes: [DirectiveType.TRANSACTION],
      offset: 0,
      limit: 8,
    },
  };
}
