import type { Posting } from "./postings-utils";

/** The parts of a New Transaction draft a person can change before Done. */
export type TransactionDraft = {
  date: string;
  payee: string;
  narration: string;
  postings: ReadonlyArray<Pick<Posting, "account" | "amountInput">>;
};

/**
 * Whether the draft differs from how the form opened.
 *
 * Compared against the seeded form, not an empty one: the screen opens with a
 * date, two suggested accounts, and zero amounts (or a receipt's prefilled
 * postings), so an untouched draft must close without asking. Posting ids are
 * ignored — they are regenerated whenever postings are rebuilt.
 */
export function isTransactionDraftDirty(
  initial: TransactionDraft,
  current: TransactionDraft,
): boolean {
  if (
    initial.date !== current.date ||
    initial.payee !== current.payee ||
    initial.narration !== current.narration ||
    initial.postings.length !== current.postings.length
  ) {
    return true;
  }
  return initial.postings.some(
    (posting, index) =>
      posting.account !== current.postings[index].account ||
      posting.amountInput !== current.postings[index].amountInput,
  );
}
