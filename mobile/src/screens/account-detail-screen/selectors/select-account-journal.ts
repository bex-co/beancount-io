import { AccountJournalQuery } from "@/generated-graphql/graphql";
import { PostingLite } from "@/common/tx-category";
import { resolveCurrencyBalance } from "../../../common/balance-util";
import { amountIn } from "../../../common/balance-display";
import {
  formatMoneyWithCurrency,
  formatUnits,
} from "../../../common/number-utils";
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
  /**
   * The entry's Beancount directive type ("Open", "Balance", "Pad", …) when the
   * response carries one. `title` falls back to the directive's own account, so
   * without this a non-transaction instruction is indistinguishable from a
   * transaction on that account; the row renders a label for it.
   */
  directiveType?: string;
  change: number;
  balance: number;
  /**
   * Set when the account reads in its commodity's units (see
   * `selectBalanceDisplay`): `change` and `balance` are then amounts of
   * `currency` at the recorded `scale`, and `cost` is what the change cost in
   * the operating currency, when its postings carry one.
   */
  units?: { currency: string; scale: number; cost: number | null };
};

/** The account a journal shows in units, and the commodity it holds. */
export type AccountJournalUnits = { account: string; currency: string };

/**
 * Translation key for a directive-type label, or null for a transaction (the
 * default row shape, which needs no label) and for types with no label key.
 */
export function directiveTypeLabelKey(
  directiveType: string | undefined,
): string | null {
  switch (directiveType) {
    case "Open":
      return "open";
    case "Close":
      return "close";
    case "Balance":
      return "balance";
    case "Pad":
      return "pad";
    case "Note":
      return "note";
    case "Document":
      return "document";
    case "Price":
      return "price";
    case "Custom":
      return "custom";
    default:
      return null;
  }
}

function asString(value: number | string | undefined): string {
  return typeof value === "string" ? value : "";
}

/** A posting as the entry's untyped JSON may carry it; every field is optional. */
type RawPosting = {
  account?: string;
  units?: { number?: string | number } | null;
  cost?: { number?: string | number; currency?: string } | null;
};

/** The entry's postings. `entry` is an opaque JSON scalar, so read defensively. */
function postingsOf(entry: AccountJournalItem["entry"]): RawPosting[] {
  const postings = (entry as { postings?: unknown }).postings;
  return Array.isArray(postings) ? (postings as RawPosting[]) : [];
}

/**
 * Postings the entry touches (account + amount), for the row icon, falling back
 * to the directive's own account (Open, Close, Balance, …) with no amount.
 */
function entryPostings(entry: AccountJournalItem["entry"]): PostingLite[] {
  const result = postingsOf(entry)
    .filter((p) => typeof p?.account === "string" && p.account)
    .map((p) => ({
      account: p.account as string,
      amount: p?.units?.number != null ? Number(p.units.number) : undefined,
    }));
  if (result.length > 0) return result;
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

/**
 * Whether more pages remain. Stops when every unique entry is loaded, when
 * the server returns an empty page, or when a non-empty page adds nothing
 * after dedup (full overlap at `offset = loaded` — further fetches cannot
 * advance and would loop forever).
 */
export function hasMoreAccountJournal(
  loaded: number,
  total: number,
  lastPage?: { incoming: number; added: number },
): boolean {
  if (loaded >= total) {
    return false;
  }
  if (lastPage && (lastPage.incoming === 0 || lastPage.added === 0)) {
    return false;
  }
  return true;
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
    const units = data[0].units;
    // Sign is an explicit prefix; the amount carries the symbol (or code suffix).
    const totalChange = units
      ? formatUnits(
          net,
          units.currency,
          Math.max(...data.map((r) => r.units?.scale ?? 0)),
          net > 0,
        )
      : `${net > 0 ? "+" : net < 0 ? "-" : ""}${formatMoneyWithCurrency(net, currency)}`;
    return {
      isoDate,
      displayDate: formatLedgerDate(isoDate, locale),
      totalChange,
      data,
    };
  });
}

/**
 * What an entry's postings to `account`, or beneath it, cost in `currency` —
 * units × per-unit cost, as the at-cost journal would have summed them. Null
 * when no such posting carries a cost in that currency (vacation hours).
 */
function postingsCost(
  entry: AccountJournalItem["entry"],
  account: string,
  currency: string,
): number | null {
  let total = 0;
  let costed = false;
  for (const posting of postingsOf(entry)) {
    const target = posting?.account;
    if (
      typeof target !== "string" ||
      (target !== account && !target.startsWith(`${account}:`)) ||
      posting.cost?.currency !== currency ||
      posting.cost.number == null ||
      posting.units?.number == null
    ) {
      continue;
    }
    total += Number(posting.units.number) * Number(posting.cost.number);
    costed = true;
  }
  return costed && Number.isFinite(total) ? total : null;
}

/**
 * Map raw journal items to display rows in the active currency — or, with
 * `units`, in the one commodity the account holds, each change carrying its
 * cost. `units` rows must come from a journal read with `conversion: "units"`.
 */
export function selectAccountJournalRows(
  currency: string,
  items: AccountJournalItem[],
  units?: AccountJournalUnits,
): AccountJournalRow[] {
  return items.map((item) => {
    const row = {
      key: accountJournalItemKey(item),
      title: entryTitle(item.entry),
      date: asString(item.entry.date),
      flag: asString(item.entry.flag) || undefined,
      payee:
        asString(item.entry.payee) ||
        asString(item.entry.narration) ||
        undefined,
      postings: entryPostings(item.entry),
      directiveType: asString(item.entry.directive_type) || undefined,
    };
    if (!units) {
      return {
        ...row,
        change: resolveCurrencyBalance(item.change, currency),
        balance: resolveCurrencyBalance(item.balance, currency),
      };
    }
    const change = amountIn(item.change, units.currency);
    const balance = amountIn(item.balance, units.currency);
    return {
      ...row,
      change: change.number,
      balance: balance.number,
      units: {
        currency: units.currency,
        scale: Math.max(change.scale, balance.scale),
        cost: postingsCost(item.entry, units.account, currency),
      },
    };
  });
}
