/**
 * The Transactions search text, kept with the ledger it was typed in. The tab
 * stays mounted across a ledger switch, so a search typed on one ledger went
 * on narrowing the next one's journal, often to "No transactions match"
 * (w21/114), the way w3/115 found the filters doing.
 */
export type ScopedSearch = {
  ledgerId: string;
  text: string;
  /** `transactionSearchResetVar` when it was typed (w21/786). */
  reset?: number;
};

/**
 * The search for `ledgerId`: its own text, or none after a switch, or after
 * a journal link replaced the filters (`reset`, w21/786).
 */
export function searchForLedger(
  search: ScopedSearch,
  ledgerId: string,
  reset = 0,
): string {
  return search.ledgerId === ledgerId && (search.reset ?? 0) === reset
    ? search.text
    : "";
}
