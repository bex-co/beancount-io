import { AccountJournalQuery } from "@/generated-graphql/graphql";
import { PostingLite } from "@/common/tx-category";
import {
  amountIn,
  formatHolding,
  notInTotalOf,
  type Holding,
} from "../../../common/balance-display";
import {
  amountScale,
  formatExactUnits,
  formatUnits,
} from "../../../common/number-utils";
import { addExact } from "../../multi-postings-transaction/postings-utils";
import { currencyMinorUnits } from "../../../common/currency-util";
import { formatAccountJournalChange } from "../utils/format-account-journal-balance";
import { entryRowSecondaryText } from "../../transactions-screen/entry-row/entry-row-secondary";
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
  /**
   * What a Note, Balance or Document says, which its title (the account) and
   * type chip do not: the note's text, the asserted amount and how far a
   * failed assertion was off, the document's file (w21/050).
   */
  detail?: AccountJournalDetail;
  change: number;
  balance: number;
  /**
   * The change and balance as the ledger wrote them, kept only when they need
   * more digits than a double holds: 18 decimals of ETH read
   * "1.234567890123460000" (w21/782).
   */
  changeExact?: string;
  balanceExact?: string;
  /** Recorded scale for operating-currency rows; drives journal amount formatting. */
  moneyScale?: number;
  /**
   * Set when the account reads in its commodity's units (see
   * `selectBalanceDisplay`): `change` and `balance` are then amounts of
   * `currency` at the recorded `scale`, and `cost` is what the change cost in
   * the operating currency, when its postings carry one.
   */
  units?: { currency: string; scale: number; cost: number | null };
  /**
   * What the entry moved in other currencies when it moved nothing in the one
   * shown: a 500 EUR deposit to a USD-read account read "$0.00" (w21/100).
   * Shown in place of the zero, not in the running total.
   */
  otherChanges?: Holding[];
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
  units?: { number?: string | number; currency?: string } | null;
  cost?: { number?: string | number; currency?: string } | null;
  price?: { number?: string | number; currency?: string } | null;
};

/**
 * The most fraction digits any posting recorded in `currency`: its own units,
 * and the cost or price it was bought or sold at. A converted figure is a
 * product of such numbers — 0.12345678 units at 60123.45 USD is 7422.647539491
 * — and its scale is the sum of theirs, which says nothing about how precisely
 * money was ever recorded (w21/207).
 */
function recordedScale(
  items: readonly AccountJournalItem[],
  currency: string,
): number {
  let widest = 0;
  for (const item of items) {
    for (const posting of postingsOf(item.entry)) {
      for (const amount of [posting?.units, posting?.cost, posting?.price]) {
        if (amount?.currency === currency && amount.number != null) {
          widest = Math.max(widest, amountScale(String(amount.number)));
        }
      }
    }
  }
  return widest;
}

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
      ...(p?.units?.currency ? { currency: p.units.currency } : {}),
    }));
  if (result.length > 0) return result;
  const account = asString(entry.account);
  return account ? [{ account }] : [];
}

/**
 * Stable identity for a journal entry, used to dedup across pages. The beancount
 * entry hash leaves out the source position, so two identical entries (two $4.50
 * coffees, same payee, same day) share one: dropped as a repeat, the twin on a
 * later page read as "the list moved" and reloaded from the top on every page,
 * forever (w21/419). The row's change and the running balance after it tell the
 * twins apart (the second one's balance is a coffee lower) while an entry
 * genuinely repeated by a shifted page still carries the same pair, since a new
 * entry at the head does not alter the balances after older ones. Hash-less
 * directives fall back to date + change + balance.
 */
export function accountJournalItemKey(item: AccountJournalItem): string {
  const hash = item.entry.entry_hash;
  if (typeof hash === "string" && hash) {
    return JSON.stringify([hash, item.change, item.balance]);
  }
  return JSON.stringify([item.entry.date, item.change, item.balance]);
}

/**
 * A unique key per item, in order: its identity key, and for each further item
 * with the same one (identical twins that net to no change, such as a transfer
 * between two children of a parent account) its ordinal, so twins on one screen
 * do not share a React key or a lookup slot (w21/613).
 */
export function accountJournalItemKeys(items: AccountJournalItem[]): string[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const key = accountJournalItemKey(item);
    const n = counts.get(key) ?? 0;
    counts.set(key, n + 1);
    return n === 0 ? key : `${key}#${n}`;
  });
}

/**
 * Merge a freshly-fetched page onto the already-loaded items. With the list's
 * `total` unchanged since it was loaded nothing moved, so a repeated key is a
 * real second entry (identical twins share even their change and balance on a
 * parent account) and the page is appended as it is; dropping the twin read as
 * "the list moved" and reloaded from page 1 forever (w21/613). When the total
 * changed, or is not known, the page may overlap what is loaded, and only
 * entries not already present are appended.
 */
export function mergeAccountJournalItems(
  existing: AccountJournalItem[],
  incoming: AccountJournalItem[],
  totals?: { loaded?: number | null; page?: number | null },
): AccountJournalItem[] {
  if (
    totals?.loaded != null &&
    totals?.page != null &&
    totals.loaded === totals.page
  ) {
    return [...existing, ...incoming];
  }
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
 * Whether a page repeated rows already loaded: an entry added at the head
 * since the first page shifts every later offset down by one. Dedup hides the
 * repeat, but the new head entry is only reached by refetching from the top
 * (w21/072; Transactions does the same, w21/035).
 */
export function accountJournalPageOverlapped(page: {
  incoming: number;
  added: number;
}): boolean {
  return page.added < page.incoming;
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

/** A non-transaction row's own content; see `AccountJournalRow.detail`. */
type AccountJournalDetail =
  | { kind: "note"; text: string }
  | { kind: "document"; text: string }
  | { kind: "narration"; text: string }
  | {
      kind: "balance";
      /**
       * The asserted amount, as recorded, with its explicit tolerance ("49.75
       * USD", "49.75 ~ 0.05 USD").
       */
      amount: string;
      /** How far the account was off, when the assertion failed. */
      offBy: string | null;
    };

type RawAmount = { number?: string | number | null; currency?: string | null };

function amountText(raw: unknown): string | null {
  const amount = raw as RawAmount | null | undefined;
  if (amount?.number == null || !amount.currency) return null;
  return `${amount.number} ${amount.currency}`;
}

/**
 * An assertion's amount as Beancount writes it, its `~` tolerance included:
 * left out, an assertion that passed 0.03 off read as a silent mismatch
 * (w21/744).
 */
function assertedText(raw: unknown, tolerance: unknown): string | null {
  const amount = raw as RawAmount | null | undefined;
  if (amount?.number == null || !amount.currency) return null;
  const within =
    typeof tolerance === "string" || typeof tolerance === "number"
      ? ` ~ ${tolerance}`
      : "";
  return `${amount.number}${within} ${amount.currency}`;
}

function entryDetail(
  entry: AccountJournalItem["entry"],
): AccountJournalDetail | undefined {
  const raw = entry as Record<string, unknown>;
  switch (raw.directive_type) {
    case "Note": {
      const text = typeof raw.comment === "string" ? raw.comment.trim() : "";
      return text ? { kind: "note", text } : undefined;
    }
    case "Document": {
      const text = typeof raw.filename === "string" ? raw.filename : "";
      return text ? { kind: "document", text } : undefined;
    }
    case "Transaction": {
      // The line Transactions shows under a payee, so same-payee rows tell
      // apart here too (w21/212).
      const text = entryRowSecondaryText({
        payee: asString(raw.payee as string | undefined),
        narration: asString(raw.narration as string | undefined),
      });
      return text ? { kind: "narration", text } : undefined;
    }
    case "Balance": {
      const amount = assertedText(raw.amount, raw.tolerance);
      return amount
        ? { kind: "balance", amount, offBy: amountText(raw.diff_amount) }
        : undefined;
    }
    default:
      return undefined;
  }
}

/** The payee, else the narration, trimmed: a payee of spaces names nothing (w21/568, w21/667). */
function payeeOrNarration(entry: AccountJournalItem["entry"]): string {
  return asString(entry.payee).trim() || asString(entry.narration).trim();
}

function entryTitle(entry: AccountJournalItem["entry"]): string {
  const named = payeeOrNarration(entry);
  // A bare transaction has no name of its own. Its directive type is the
  // English word "Transaction", which the row's translated fallback never got
  // to replace (w21/241): leave the title empty for it.
  if (!named && asString(entry.directive_type) === "Transaction") return "";
  return named || asString(entry.account) || asString(entry.directive_type);
}

/**
 * Amounts in their own currencies, signed and code-suffixed at their recorded
 * scale: "+500.00 EUR", "-2 ITOT".
 */
export function formatOtherChanges(holdings: readonly Holding[]): string {
  return holdings.map((holding) => formatHolding(holding, true)).join(", ");
}

/** An amount as a plain decimal string: its exact text, else its figure. */
const decimalOf = (amount: {
  number: number;
  scale: number;
  exact?: string;
}): string => amount.exact ?? amount.number.toFixed(amount.scale);

/**
 * Amounts summed through their decimal strings when one holds more digits
 * than a double does, else as numbers: the exact sum, when there is one.
 */
function exactSum(
  amounts: readonly { number: number; scale: number; exact?: string }[],
): string | undefined {
  if (!amounts.some((amount) => amount.exact !== undefined)) return undefined;
  return amounts.reduce((sum, amount) => addExact(sum, decimalOf(amount)), "0");
}

/** Each currency's sum over the rows' other-currency changes. */
function sumOtherChanges(rows: readonly AccountJournalRow[]): Holding[] {
  const sums = new Map<string, Holding>();
  for (const row of rows) {
    for (const holding of row.otherChanges ?? []) {
      const sum = sums.get(holding.currency);
      const scale = Math.max(sum?.scale ?? 0, holding.scale);
      const exact = exactSum(sum ? [sum, holding] : [holding]);
      sums.set(holding.currency, {
        currency: holding.currency,
        number: (sum?.number ?? 0) + holding.number,
        scale,
        ...(exact !== undefined ? { exact } : {}),
      });
    }
  }
  return [...sums.values()].filter(
    (sum) => Math.abs(sum.number) >= 0.5 * 10 ** -sum.scale,
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
  /**
   * More pages remain: the last day may run on into one, so a total over its
   * loaded rows is the wrong total ("−$80.00" for a −$100.00 day of 25 entries).
   * It is left out until the day is complete (w21/892).
   */
  morePages = false,
): AccountJournalSection[] {
  const groups = new Map<string, AccountJournalRow[]>();
  for (const row of rows) {
    const isoDate = row.date.slice(0, 10);
    if (!groups.has(isoDate)) groups.set(isoDate, []);
    groups.get(isoDate)!.push(row);
  }
  const last = groups.size - 1;
  return Array.from(groups.entries()).map(([isoDate, data], index) => {
    const units = data[0].units;
    const scale = units
      ? Math.max(...data.map((r) => r.units?.scale ?? 0))
      : Math.max(...data.map((r) => r.moneyScale ?? 2));
    // Rounded to what the header shows before its sign is read: summed as
    // floats, 4.10 + 8.20 − 12.30 left −1.8e-15, a day of "-$0.00" over rows
    // that net to nothing (w21/163). `+ 0` turns a rounded -0 into 0.
    const net =
      Number(data.reduce((sum, r) => sum + r.change, 0).toFixed(scale)) + 0;
    // A day that moved only other currencies says so, not "$0.00" (w21/100);
    // one that moved both names the others beside the shown total (w21/421).
    const others = sumOtherChanges(data);
    // Sign is an explicit prefix; the amount carries the symbol (or code suffix).
    const exactNet = units
      ? exactSum(
          data.map((r) => ({
            number: r.change,
            scale,
            exact: r.changeExact,
          })),
        )
      : undefined;
    const shown = units
      ? ((exactNet !== undefined
          ? formatExactUnits(exactNet, units.currency, net > 0)
          : null) ?? formatUnits(net, units.currency, scale, net > 0))
      : formatAccountJournalChange(net, currency, scale);
    const totalChange =
      others.length === 0
        ? shown
        : net === 0
          ? formatOtherChanges(others)
          : `${shown} · ${formatOtherChanges(others)}`;
    return {
      isoDate,
      displayDate: formatLedgerDate(isoDate, locale),
      totalChange: morePages && index === last ? "" : totalChange,
      data,
    };
  });
}

/**
 * What an entry's postings to `account`, or beneath it, cost in `currency` —
 * units × per-unit cost, as the at-cost journal would have summed them. Only
 * the postings of the one `commodity` count: an exchange of one fund for another
 * costed the leg it gave up too, and read "$0.00" (w21/422). Null when no such
 * posting carries a cost in that currency (vacation hours).
 */
function postingsCost(
  entry: AccountJournalItem["entry"],
  account: string,
  currency: string,
  commodity: string,
): number | null {
  let total = 0;
  let costed = false;
  for (const posting of postingsOf(entry)) {
    const target = posting?.account;
    if (
      typeof target !== "string" ||
      (target !== account && !target.startsWith(`${account}:`)) ||
      posting.units?.currency !== commodity ||
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
  // Money views read at the precision the ledger recorded in the currency, not
  // at whatever a unit-times-cost conversion happened to produce.
  // Entries that carry no postings give nothing to measure against.
  const moneyCap =
    units || !items.some((item) => postingsOf(item.entry).length > 0)
      ? Infinity
      : Math.max(currencyMinorUnits(currency), recordedScale(items, currency));
  const keys = accountJournalItemKeys(items);
  return items.flatMap((item, index): AccountJournalRow[] => {
    // A Custom directive naming the account configures it (the Budget tab's
    // `custom "budget"`) and moves nothing: it read as a blank "Custom" row
    // of $0.00, in English, under a "$0.00" day (w21/741).
    if (asString(item.entry.directive_type) === "Custom") return [];
    const row = {
      key: keys[index],
      title: entryTitle(item.entry),
      date: asString(item.entry.date),
      flag: asString(item.entry.flag) || undefined,
      payee: payeeOrNarration(item.entry) || undefined,
      postings: entryPostings(item.entry),
      directiveType: asString(item.entry.directive_type) || undefined,
      detail: entryDetail(item.entry),
    };
    const shown = units?.currency ?? currency;
    const change = amountIn(item.change, shown);
    // Beside a shown change too: an FX conversion moves two currencies and
    // the other leg was nowhere (w21/421).
    const others = notInTotalOf(item.change, shown);
    const otherChanges = others.length > 0 ? { otherChanges: others } : {};
    const exact = (balance: { exact?: string }) => ({
      ...(change.exact !== undefined ? { changeExact: change.exact } : {}),
      ...(balance.exact !== undefined ? { balanceExact: balance.exact } : {}),
    });
    if (!units) {
      const balance = amountIn(item.balance, currency);
      return [
        {
          ...row,
          ...otherChanges,
          ...exact(balance),
          change: change.number,
          balance: balance.number,
          moneyScale: Math.min(Math.max(change.scale, balance.scale), moneyCap),
        },
      ];
    }
    const balance = amountIn(item.balance, units.currency);
    return [
      {
        ...row,
        ...otherChanges,
        ...exact(balance),
        change: change.number,
        balance: balance.number,
        units: {
          currency: units.currency,
          scale: Math.max(change.scale, balance.scale),
          cost: postingsCost(
            item.entry,
            units.account,
            currency,
            units.currency,
          ),
        },
      },
    ];
  });
}
