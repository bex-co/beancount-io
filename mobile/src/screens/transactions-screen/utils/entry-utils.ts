import { JournalDirectiveType, isJournalTransaction } from "../types";

/**
 * Collects every account a directive touches, for resolving its row icon.
 *
 * Transactions expose their postings; most other directives (Open, Close,
 * Balance, Note, Document, Pad) are anchored to a single account. Price,
 * Commodity, Event and Custom have none — they return `[]` and fall back to a
 * neutral glyph.
 *
 * @param entry - Any journal directive
 * @returns The directive's account names, possibly empty
 */
export const getEntryAccounts = (entry: JournalDirectiveType): string[] => {
  if (isJournalTransaction(entry)) {
    return entry.postings?.map((p) => p.account).filter(Boolean) ?? [];
  }
  const account = (entry as { account?: string }).account;
  return account ? [account] : [];
};
