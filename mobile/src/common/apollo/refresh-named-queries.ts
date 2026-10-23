/**
 * Queries a pull-to-refresh on a tab must also reach (w21/839). The bell in
 * every tab header counts the ledger's errors, and Accounts hides closed,
 * emptied accounts by the close dates it read; neither is the tab's own list,
 * so a pull left both as they were until the app was backgrounded.
 *
 * Free of React Native and `@/` imports so the unit runner can load it.
 */
export const LEDGER_ERROR_QUERIES = [
  "getLedgerErrors",
  "getLedgerErrorsBasic",
] as const;
export const ACCOUNT_CLOSE_DATE_QUERIES = ["LedgerAccountCloseDates"] as const;

/** Refetch the watched queries with these operation names. Never rejects: a pull offline keeps what is shown. */
export async function refetchNamedQueries(
  client: {
    refetchQueries: (options: { include: string[] }) => Promise<unknown>;
  },
  names: readonly string[],
): Promise<void> {
  try {
    await client.refetchQueries({ include: [...names] });
  } catch {
    // The tab's own refetch reports its failure.
  }
}
