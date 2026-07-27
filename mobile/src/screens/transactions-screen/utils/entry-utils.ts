import { PostingLite } from "@/common/tx-category";
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

/**
 * Like {@link getEntryAccounts} but keeps each posting's amount, so the row icon
 * can weight the postings (the largest category leg drives the glyph). Non-
 * transaction directives yield a single amount-less posting for their account.
 *
 * @param entry - Any journal directive
 * @returns Postings with account + numeric amount (NaN when unparseable)
 */
export const getEntryPostings = (
  entry: JournalDirectiveType,
): PostingLite[] => {
  if (isJournalTransaction(entry)) {
    return (
      entry.postings
        ?.filter((p) => p.account)
        .map((p) => ({
          account: p.account,
          amount: p.units?.number != null ? Number(p.units.number) : undefined,
        })) ?? []
    );
  }
  const account = (entry as { account?: string }).account;
  return account ? [{ account }] : [];
};
