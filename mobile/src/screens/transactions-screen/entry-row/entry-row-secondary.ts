/**
 * The line under a transaction row's name: the narration, when the name shown
 * is the payee and the narration says something else. Ledgers whose payees
 * repeat (quarterly filings, a batch name stamped by an import) otherwise list
 * rows that read alike, and a search matches text no row displays.
 */
export function entryRowSecondaryText(entry: {
  payee?: string | null;
  narration?: string | null;
}): string | null {
  const payee = entry.payee?.trim();
  const narration = entry.narration?.trim();
  if (!payee || !narration || narration === payee) return null;
  return narration;
}
