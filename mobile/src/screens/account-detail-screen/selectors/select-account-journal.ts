import { AccountJournalQuery } from "@/generated-graphql/graphql";
import { PostingLite } from "@/common/tx-category";
import { resolveCurrencyBalance } from "../../../common/balance-util";
import { formatMoneyWithCurrency } from "../../../common/number-utils";
import { formatLedgerDate } from "../../../common/date-format";

/** One `{ entry, change, balance }` row from the account journal response. */
export type AccountJournalItem =
  AccountJournalQuery["getLedgerAccountJournal"]["items"][number];

/** A row shaped for display: description + date + this entry's change and the
 * running balance after it, both resolved to the active currency. */
export type AccountJournalRow = {
  key: string;
  title: string;
  date: string;
  /** Transaction flag (e.g. "!" for pending), when present. */
  flag?: string;
  /** Payee/narration text for brand-logo matching, when present. */
  payee?: string;
  /** Every posting the entry touches (account + amount); drives the row's icon,
   * including amount-weighted category selection. */
  postings: PostingLite[];
  change: number;
  balance: number;
};

function asString(value: number | string | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * Postings the entry touches (account + amount), for the row icon. `entry` is
 * an opaque JSON scalar, so read defensively and fall back to the directive's
 * own account (Open, Close, Balance, …) with no amount.
 */
function entryPostings(entry: AccountJournalItem["entry"]): PostingLite[] {
  const postings = (
    entry as {
      postings?: { account?: string; units?: { number?: string | number } }[];
    }
  ).postings;
  if (Array.isArray(postings)) {
    const result = postings
      .filter((p) => typeof p?.account === "string" && p.account)
      .map((p) => ({
        account: p.account as string,
        amount: p?.units?.number != null ? Number(p.units.number) : undefined,
      }));
    if (result.length > 0) return result;
  }
  const account = asString(entry.account);
  return account ? [{ account }] : [];
}

/**
 * Stable identity for a journal entry, used to dedup across pages. Prefers the
 * beancount entry hash; falls back to a signature of date + change + balance so
 * hash-less directives still dedup deterministically.
 */
export function accountJournalItemKey(item: AccountJournalItem): string {
  const hash = item.entry.entry_hash;
  if (typeof hash === "string" && hash) {
    return hash;
  }
  return JSON.stringify([item.entry.date, item.change, item.balance]);
}

/**
 * Merge a freshly-fetched page onto the already-loaded items, appending only
 * entries not already present (dedup by key). Guards against overlapping
 * offsets or refetch races producing duplicate rows.
 */
export function mergeAccountJournalItems(
  existing: AccountJournalItem[],
  incoming: AccountJournalItem[],
): AccountJournalItem[] {
  const seen = new Set(existing.map(accountJournalItemKey));
  const merged = [...existing];
  for (const item of incoming) {
    const key = accountJournalItemKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

/** Whether more pages remain, given loaded count and the server `total`. */
export function hasMoreAccountJournal(loaded: number, total: number): boolean {
  return loaded < total;
}

function entryTitle(entry: AccountJournalItem["entry"]): string {
  return (
    asString(entry.payee) ||
    asString(entry.narration) ||
    asString(entry.account) ||
    asString(entry.directive_type)
  );
}

/** One date-grouped section of account-journal rows for display. */
export type AccountJournalSection = {
  isoDate: string;
  displayDate: string;
  totalChange: string;
  data: AccountJournalRow[];
};

/**
 * Group display rows into date sections for the SectionList, with a net-change
 * total per section matching Journal's section-header layout.
 */
export function groupAccountJournalRowsToSections(
  rows: AccountJournalRow[],
  currency: string,
  locale = "en",
): AccountJournalSection[] {
  const groups = new Map<string, AccountJournalRow[]>();
  for (const row of rows) {
    const isoDate = row.date.slice(0, 10);
    if (!groups.has(isoDate)) groups.set(isoDate, []);
    groups.get(isoDate)!.push(row);
  }
  return Array.from(groups.entries()).map(([isoDate, data]) => {
    const net = data.reduce((sum, r) => sum + r.change, 0);
    // Sign is an explicit prefix; the amount carries the symbol (or code suffix).
    const sign = net > 0 ? "+" : net < 0 ? "-" : "";
    const totalChange = `${sign}${formatMoneyWithCurrency(net, currency)}`;
    return {
      isoDate,
      displayDate: formatLedgerDate(isoDate, locale),
      totalChange,
      data,
    };
  });
}

/** Map raw journal items to display rows in the active currency. */
export function selectAccountJournalRows(
  currency: string,
  items: AccountJournalItem[],
): AccountJournalRow[] {
  return items.map((item) => ({
    key: accountJournalItemKey(item),
    title: entryTitle(item.entry),
    date: asString(item.entry.date),
    flag: asString(item.entry.flag) || undefined,
    payee:
      asString(item.entry.payee) || asString(item.entry.narration) || undefined,
    postings: entryPostings(item.entry),
    change: resolveCurrencyBalance(item.change, currency),
    balance: resolveCurrencyBalance(item.balance, currency),
  }));
}
