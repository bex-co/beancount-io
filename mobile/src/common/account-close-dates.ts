import { foldAccents } from "./accent-fold";
import { foldArabicScript } from "./arabic-script-fold";
/**
 * Which accounts a new posting may use on a given date (w21/045).
 *
 * The posting pickers listed every declared account, closed ones included, so
 * a paid-off card could be picked and the save refused only at Done: "Posting
 * to inactive account … (closed on …)". An account closed on or after the
 * entry's date still takes it — Beancount sorts a `close` after same-day
 * transactions, which rustledger confirms — so a back-dated entry can use an
 * account that was open that day.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */

/**
 * Close date per account, from `getLedgerAccountDirectives`. It also carries
 * each account's open date (`openedOn`) when the read supplied one, so every
 * caller that asks whether an account takes an entry also hears that it was
 * not opened until later (w21/229).
 */
export type CloseDates = ReadonlyMap<string, string> & {
  readonly openedOn?: ReadonlyMap<string, string>;
};

export function closeDatesOf(
  directives:
    | readonly {
        account: string;
        closedAt?: string | null;
        openedAt?: string | null;
      }[]
    | null
    | undefined,
): CloseDates {
  const dates = new Map<string, string>();
  const opened = new Map<string, string>();
  for (const { account, closedAt, openedAt } of directives ?? []) {
    if (closedAt) dates.set(account, closedAt.slice(0, 10));
    if (openedAt) opened.set(account, openedAt.slice(0, 10));
  }
  return Object.assign(dates, { openedOn: opened });
}

/**
 * Whether a budget that ends on `endsOn` (`budgetEndsOn`) has ended by `today`.
 * Its card offers no Update then: the new directive would be written and never
 * apply, the budget staying $0 after the close (w21/624).
 */
export function budgetHasEnded(
  endsOn: string | undefined,
  today: string,
): boolean {
  return endsOn !== undefined && endsOn <= today;
}

/**
 * The day a budget on `account` ends: the account's close date, once every
 * account beneath it is closed too, else null. The budget's actuals roll up
 * every descendant, and Beancount refuses postings only to the closed account
 * itself, so a parent closed when it was split into open children keeps taking
 * spending and its budget runs on (w21/486). Without a declared-account list
 * the descendants are not known and the account's own date stands.
 */
export function budgetEndsOn(
  account: string,
  closeDates: CloseDates,
): string | undefined {
  const own = closeDates.get(account);
  if (own === undefined) return undefined;
  let end = own;
  // Every account the read knows: the closed ones and the declared ones.
  const known = new Set([
    ...closeDates.keys(),
    ...(closeDates.openedOn?.keys() ?? []),
  ]);
  for (const declared of known) {
    if (!declared.startsWith(`${account}:`)) continue;
    const closedAt = closeDates.get(declared);
    if (closedAt === undefined) return undefined;
    if (closedAt > end) end = closedAt;
  }
  return end;
}

/**
 * Whether a budget on `account` ended before `day`. It has nothing left to
 * track: a former job's income target went red every month after the account
 * closed and outranked real overspends on Home (w21/398).
 */
export function closedBefore(
  account: string,
  day: string,
  closeDates: CloseDates,
): boolean {
  const end = budgetEndsOn(account, closeDates);
  return end !== undefined && end < day;
}

/**
 * Whether `account` takes an entry dated `entryDate` (YYYY-MM-DD): opened on
 * or before it and not closed before it. An account opened later was offered
 * for a back-dated entry, and Done was refused with "not opened until".
 */
export function isOpenOn(
  account: string,
  entryDate: string,
  closeDates: CloseDates,
): boolean {
  const openedAt = closeDates.openedOn?.get(account);
  if (openedAt !== undefined && entryDate < openedAt) return false;
  const closedAt = closeDates.get(account);
  return closedAt === undefined || entryDate <= closedAt;
}

/**
 * Whether the ledger declares `account` (an `open` directive). Not claimed
 * when the read carried no declared accounts at all, so a failed or old read
 * never turns every account unknown.
 */
function isDeclared(account: string, closeDates: CloseDates): boolean {
  const opened = closeDates.openedOn;
  if (!opened || (opened.size === 0 && closeDates.size === 0)) return true;
  return opened.has(account) || closeDates.has(account);
}

/**
 * Whether a suggested account can be seeded into a posting: declared by the
 * ledger and open on the date. A receipt parse used to prefill an account the
 * ledger never opened, and the save then wrote it (w21/281).
 */
export function isSeedableOn(
  account: string,
  entryDate: string,
  closeDates: CloseDates,
): boolean {
  return (
    isDeclared(account, closeDates) && isOpenOn(account, entryDate, closeDates)
  );
}

/** The accounts a posting dated `entryDate` can use, in their order. */
export function openOn(
  accounts: readonly string[],
  entryDate: string,
  closeDates: CloseDates,
): string[] {
  return accounts.filter((account) => isOpenOn(account, entryDate, closeDates));
}

/**
 * The accounts the Accounts tree lists even at zero: every opened account but
 * those closed on or before `today`. A closed, emptied account kept showing as
 * a live "$0.00" row (w21/099). One closed with a balance left still lists,
 * through the balance itself: that is a ledger problem worth seeing. An account
 * that opens after `today` is not listed yet either: it read as a live "$0.00"
 * row, and a ledger with no other liabilities brought back a whole empty section
 * (w21/614).
 */
export function listedAccountsAsOf(
  accounts: readonly string[],
  today: string,
  closeDates: CloseDates,
): string[] {
  return accounts.filter((account) => {
    const openedAt = closeDates.openedOn?.get(account);
    if (openedAt !== undefined && openedAt > today) return false;
    const closedAt = closeDates.get(account);
    return closedAt === undefined || closedAt > today;
  });
}

/**
 * The closed account a search names exactly (ignoring case), with its close
 * date, when it is closed by `onDate`. A posting picker hides closed accounts,
 * so their exact name read as new and offered Create, which Open Account then
 * refused as "already open" (w21/122).
 */
/** An account name as the picker compares it: NFC, lower-cased, one Arabic-script spelling (w21/836), without Latin accents (w21/929). */
export function nameKey(text: string): string {
  return foldAccents(foldArabicScript(text.normalize("NFC"))).toLowerCase();
}

export function closedAccountNamed(
  query: string,
  onDate: string,
  closeDates: CloseDates,
): { account: string; closedAt: string } | null {
  // As NFC, like the picker's search: a decomposed "Cafe" + U+0301 is the
  // account the user typed as "Café" (w21/256).
  const wanted = nameKey(query.trim());
  if (!wanted) return null;
  for (const [account, closedAt] of closeDates) {
    if (nameKey(account) === wanted && !isOpenOn(account, onDate, closeDates)) {
      return { account, closedAt };
    }
  }
  return null;
}

/**
 * The account a search names exactly (ignoring case) that the ledger opens only
 * after `onDate`, with its open date. A posting picker hides it for a back-dated
 * entry, so its exact name read as new and offered Create, which Open Account
 * then refused as "already open" (w21/374).
 */
export function notYetOpenAccountNamed(
  query: string,
  onDate: string,
  closeDates: CloseDates,
): { account: string; openedAt: string } | null {
  const wanted = nameKey(query.trim());
  if (!wanted) return null;
  for (const [account, openedAt] of closeDates.openedOn ?? []) {
    if (nameKey(account) === wanted && onDate < openedAt) {
      return { account, openedAt };
    }
  }
  return null;
}

/**
 * The first day any of `accounts` opens, when none of them takes an entry
 * dated `onDate` because they all open later. A back-dated entry's picker came
 * up blank as "No matching accounts" before anything was typed, with nothing
 * to say why (w21/643). Null when one is open, or the open dates are unknown.
 */
export function firstOpeningAfter(
  accounts: readonly string[],
  onDate: string,
  closeDates: CloseDates,
): string | null {
  let first: string | null = null;
  for (const account of accounts) {
    if (isOpenOn(account, onDate, closeDates)) return null;
    const openedAt = closeDates.openedOn?.get(account);
    if (openedAt !== undefined && onDate < openedAt) {
      if (first === null || openedAt < first) first = openedAt;
    }
  }
  return first;
}

/**
 * The day `account` closed, when a budget (or entry) dated `onDate` falls after
 * it: that budget never applies (w21/877). Undefined for an account that is
 * open, unknown, or not yet closed on that date.
 */
export function closedBeforeDate(
  account: string,
  onDate: string,
  closeDates: CloseDates,
): string | undefined {
  const closedAt = closeDates.get(account.trim());
  return closedAt !== undefined && onDate > closedAt ? closedAt : undefined;
}
