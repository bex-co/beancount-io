import type { Posting } from "./postings-utils";

/** A payee's usual accounts, from its two-posting history. */
export type PayeeHistory = {
  from: { autoFill: string | null };
  to: { autoFill: string | null };
};

type DraftPosting = Pick<Posting, "account">;

/**
 * Whether the accounts are still the form's own. As for a second payee
 * (w21/411), an amount typed first is no account edit: amount-then-payee kept
 * the default accounts, payee-then-amount got the payee's (w21/729).
 */
const untouched = (
  current: readonly Posting[],
  initial: readonly DraftPosting[],
) =>
  current.length === 2 &&
  initial.length === 2 &&
  current.every(
    (posting, index) => posting.account === initial[index]!.account,
  );

/**
 * Whether the accounts are still the ones the last payee fill put there. A
 * second payee found the form "changed" by the first fill and left the first
 * payee's card and category in place (w21/411); only a user edit to an account
 * counts as touching it, so amounts typed since do not.
 */
const unchangedSinceSeed = (
  current: readonly Posting[],
  lastSeed: readonly string[] | null | undefined,
) =>
  lastSeed != null &&
  current.length === lastSeed.length &&
  current.every((posting, index) => posting.account === lastSeed[index]);

/**
 * The postings to show once a known payee is picked: its usual source and
 * target accounts, so a repeat entry needs no account picks — what the keypad
 * flow did before multi-posting became the default (w21/023). Null leaves the
 * postings alone: the user already changed them, the form holds a split, or
 * the payee has no two-posting history on both sides. Amounts are never
 * touched. A usual account closed by the entry's date is not filled in — its
 * side keeps the form's default, so the save is not refused for a paid-off
 * card (w21/045) — and when both are closed nothing changes.
 */
export function seedPostingsFromPayee(
  current: readonly Posting[],
  initial: readonly DraftPosting[],
  history: PayeeHistory,
  isOpen: (account: string) => boolean = () => true,
  /** The accounts the previous payee fill produced, if there was one. */
  lastSeed?: readonly string[] | null,
): Posting[] | null {
  const from = history.from.autoFill;
  const to = history.to.autoFill;
  // Never fill the same account on both sides: a self-transfer saves with no
  // warning (w21/412).
  if (!from || !to || from === to) return null;
  if (!untouched(current, initial) && !unchangedSinceSeed(current, lastSeed)) {
    return null;
  }
  const fromOpen = isOpen(from);
  const toOpen = isOpen(to);
  if (!fromOpen && !toOpen) return null;
  const seeded = [
    { ...current[0]!, account: fromOpen ? from : current[0]!.account },
    { ...current[1]!, account: toOpen ? to : current[1]!.account },
  ];
  // A closed side keeps the form's account, which may be the other side's fill:
  // the same self-transfer the guard above refuses (w21/834).
  return seeded[0]!.account === seeded[1]!.account ? null : seeded;
}
