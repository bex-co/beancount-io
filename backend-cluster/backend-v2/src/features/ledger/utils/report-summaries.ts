import BigNumber from "bignumber.js";
import type {
  BalanceSheetDataPublic,
  DateAndBalanceWithAccountBalancePublic,
  IncomeStatementDataPublic,
  OverviewPublic,
  SerializableTreeNodePublic,
} from "@/foundation/fava";

/**
 * The statements, shaped for a reader rather than for a chart (w2/m28:t002).
 *
 * Fava's report payloads are what the dashboard's charts consume: one series
 * per interval, a full account tree including every zero-balance account, and
 * `*_hierarchy_data` nested to the ledger's full depth. For a one-transaction
 * ledger that is 5.9 KB of trial balance, and every agent in the field audit
 * went around it — computing net worth and spending with BQL instead, because
 * extracting a number from a chart payload is harder than writing a query.
 *
 * These projections answer the question the statement is actually asked: what
 * are the totals, and which accounts carry them. Nothing is recomputed — the
 * services already produced these numbers — and nothing is lost, because
 * `shape=fava` still returns the payload above.
 *
 * Amounts are numbers in one stated currency. A statement in three currencies
 * cannot be added up, and pretending otherwise would be worse than reporting
 * the one the caller asked to convert to. What the other currencies hold is
 * not dropped silently: each summary's `otherCurrencies` gives it, on the same
 * basis as the headline number (w23/050).
 *
 * Those numbers are JSON numbers, not the decimal strings Fava sends, because
 * an agent asked for a total wants something it can compare and add without
 * parsing. The cost is real and bounded: a magnitude past 2^53 rounds. Any
 * caller that needs the exact decimal has `shape=fava`, which never converts.
 */

/**
 * Per currency other than the summary's, the amount its headline number
 * leaves out — net worth, net profit, or an interval's total. Present only
 * when the stated currency does not carry everything. Under `units`, or a conversion the
 * ledger has no prices for, stocks and funds stay in their own commodities
 * and appear here rather than vanishing from the totals (w23/050).
 */
type OtherCurrencies = Readonly<Record<string, number>>;

/**
 * A currency the requested conversion could not reach: its amounts stayed
 * in `from` because the ledger has no price path to `to` (w23/m16). The
 * shape holdings uses for `missing_prices`.
 */
interface MissingPrice {
  readonly from: string;
  readonly to: string;
}

/** One account and what it holds, in the summary's currency. */
export interface AccountBalance {
  readonly account: string;
  readonly balance: number;
}

export interface BalanceSheetSummary {
  /** Last date the statement covers, or `null` for an empty ledger. */
  readonly asOf: string | null;
  readonly currency: string;
  /**
   * How every amount below is valued (w6/009). `asOf` cuts off which
   * positions count; it does not date the prices. `units` reports positions
   * unconverted, `cost` at their booked cost, and `latest-price` — a currency
   * conversion or `at_value` — at the ledger's most recent price, not the
   * price on `asOf`. A conversion to a currency the ledger has no prices for
   * converts nothing, so it reads `units` (w23/050).
   */
  readonly valuation: "units" | "cost" | "latest-price";
  /** What `netWorth` leaves out, per other currency. */
  readonly otherCurrencies?: OtherCurrencies;
  /** Present only when the requested conversion did not reach everything. */
  readonly missingPrices?: readonly MissingPrice[];
  readonly assets: number;
  readonly liabilities: number;
  readonly equity: number;
  /** Always `assets + liabilities`, on the same basis as the accounts. */
  readonly netWorth: number;
  readonly byAccount: readonly AccountBalance[];
}

export interface IncomeStatementSummary {
  /**
   * Which dates the totals cover.
   *
   * `to` is the last chart bucket's inclusive end, which is the statement's
   * end. `from` is `null`: every chart point is dated by its bucket's **end**,
   * so the first point names the end of the first month or quarter rather than
   * the day the totals start — August's results are not August 31's — and the
   * payload carries no other start (w6/005). `time` is the selection exactly
   * as the caller made it, `null` for the whole history, so the scope stays
   * legible without a second time-expression parser guessing at its start.
   */
  readonly period: {
    readonly from: string | null;
    readonly to: string | null;
    readonly time: string | null;
  };
  readonly currency: string;
  readonly income: number;
  readonly expenses: number;
  readonly net: number;
  /** What `net` leaves out, per other currency. */
  readonly otherCurrencies?: OtherCurrencies;
  /** Present only when the requested conversion did not reach everything. */
  readonly missingPrices?: readonly MissingPrice[];
  readonly byAccount: readonly AccountBalance[];
}

export interface OverviewSummary {
  readonly currency: string;
  readonly netWorth: number;
  /** What the latest `netWorth` leaves out, per other currency. */
  readonly otherCurrencies?: OtherCurrencies;
  /** Present only when the requested conversion did not reach everything. */
  readonly missingPrices?: readonly MissingPrice[];
  readonly series: readonly { date: string; netWorth: number }[];
}

interface IntervalTotal {
  readonly period: string;
  readonly total: number;
  /** What `total` leaves out, per other currency. */
  readonly otherCurrencies?: OtherCurrencies;
  readonly byAccount: readonly AccountBalance[];
}

/**
 * The interval series, with its currency stated once.
 *
 * A bare array of intervals has nowhere to say what unit its numbers are in,
 * and repeating the currency on every interval is the duplication these
 * summaries exist to remove — so the intervals sit under one named field.
 */
export interface IntervalTotalsSummary {
  readonly currency: string;
  /** Present only when the requested conversion did not reach everything. */
  readonly missingPrices?: readonly MissingPrice[];
  readonly intervals: readonly IntervalTotal[];
}

/** A currency-keyed balance, as every Fava payload spells it. */
type Balance = Record<string, string>;

/**
 * Which currency the summary reports in.
 *
 * The caller's `conversion` wins when the data actually carries it — a
 * requested currency the ledger never uses would make every total zero, which
 * reads as "no money" rather than "wrong currency". Otherwise the most common
 * currency across the balances is the ledger's working one.
 */
export function resolveCurrency(
  balances: readonly Balance[],
  requested?: string,
): string {
  const counts = new Map<string, number>();
  for (const balance of balances) {
    // A period with no postings comes back with no balance at all, and a
    // ledger of those must still produce a summary rather than a crash.
    if (!balance || typeof balance !== "object") continue;
    for (const currency of Object.keys(balance)) {
      counts.set(currency, (counts.get(currency) ?? 0) + 1);
    }
  }
  if (requested && counts.has(requested)) return requested;
  let best = requested ?? "USD";
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

function amount(balance: Balance | null | undefined, currency: string): number {
  const raw = balance?.[currency];
  if (raw === undefined) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/**
 * `{ otherCurrencies }` with the sum of `balances` in every currency but
 * `currency`, zeros dropped — or nothing, when no other currency remains.
 */
function otherCurrencies(
  balances: readonly (Balance | null | undefined)[],
  currency: string,
  sign = 1,
): { otherCurrencies?: OtherCurrencies } {
  const totals = new Map<string, BigNumber>();
  for (const balance of balances) {
    for (const [code, raw] of Object.entries(balance ?? {})) {
      const value = Number(raw);
      if (code === currency || !Number.isFinite(value)) continue;
      totals.set(code, (totals.get(code) ?? new BigNumber(0)).plus(raw));
    }
  }
  const entries = [...totals]
    .filter(([, value]) => !value.isZero())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, value]) => [code, value.times(sign).toNumber()]);
  return entries.length > 0
    ? { otherCurrencies: Object.fromEntries(entries) }
    : {};
}

/**
 * `{ missingPrices }` for an explicit currency conversion that left money
 * elsewhere: every other currency the summary reports, plus the summary's own
 * currency when the data never reached the requested one (a USD-only ledger
 * asked for EUR states USD with no hint otherwise). Nothing for a strategy
 * (`units`, `at_cost`, `at_value`), an omitted conversion, or a fully
 * converted report. `others` are the currencies left out of the headline.
 */
function missingPrices(
  requested: string | undefined,
  currency: string,
  others: readonly string[],
): { missingPrices?: MissingPrice[] } {
  if (!requested) return {};
  const from = new Set(others);
  if (currency !== requested) from.add(currency);
  from.delete(requested);
  return from.size > 0
    ? {
        missingPrices: [...from]
          .sort((a, b) => a.localeCompare(b))
          .map((code) => ({ from: code, to: requested })),
      }
    : {};
}

/** The currencies an `otherCurrencies` result names. */
const namesOf = (result: { otherCurrencies?: OtherCurrencies }): string[] =>
  Object.keys(result.otherCurrencies ?? {});

/** A hierarchy root's own and children's balances, which sum to its total. */
function rootBalances(
  node: SerializableTreeNodePublic | null | undefined,
): Balance[] {
  return node ? [node.balance_children, node.balance] : [];
}

/**
 * The balances a summary chooses its currency from.
 *
 * Transfers can cancel every aggregate while their accounts still move, and
 * a currency read off nothing falls back to whatever was requested — a
 * strategy name or a currency the data never carries — so every account then
 * reads as zero and disappears (w6/004, w6/006). The aggregates keep their
 * policy whenever they name a currency; only when none does are the
 * accounts' own balances consulted.
 */
function currencyEvidence(
  aggregates: readonly Balance[],
  accounts: () => readonly Balance[],
): readonly Balance[] {
  return aggregates.some(
    (balance) =>
      balance && typeof balance === "object" && Object.keys(balance).length > 0,
  )
    ? aggregates
    : accounts();
}

/** A conversion strategy describes how to value postings, not their currency. */
function requestedCurrency(conversion?: string): string | undefined {
  return conversion === "units" ||
    conversion === "at_cost" ||
    conversion === "at_value"
    ? undefined
    : conversion;
}

/** Every node's own balance in a hierarchy, descendants included. */
function ownBalances(
  node: SerializableTreeNodePublic | null | undefined,
  into: Balance[] = [],
): Balance[] {
  if (!node) return into;
  into.push(node.balance);
  for (const child of node.children ?? []) ownBalances(child, into);
  return into;
}

/**
 * Every account in a hierarchy that holds something, with its own balance.
 *
 * The node's own `balance` rather than `balance_children`: a parent's children
 * are listed individually, so reporting both would count the same money twice.
 * Zero-balance accounts are dropped — an agent asking what the books hold is
 * not asking which accounts exist, and the vocabulary resource answers that.
 */
export function flattenHierarchy(
  node: SerializableTreeNodePublic | null | undefined,
  currency: string,
  into: AccountBalance[] = [],
): AccountBalance[] {
  if (!node) return into;
  const balance = amount(node.balance, currency);
  if (balance !== 0 && node.account)
    into.push({ account: node.account, balance });
  for (const child of node.children ?? []) {
    flattenHierarchy(child, currency, into);
  }
  return into;
}

/**
 * The exact decimal sum of amounts, as a JSON number.
 *
 * Each amount is the ledger's decimal string read as a number, and
 * `String(n)` gives that decimal back exactly, so summing those strings
 * loses nothing: `3609.87 + -2703.29` is `906.58`, where float addition
 * printed `906.5799999999999` (w23/013).
 */
function sum(...values: number[]): number {
  return values
    .reduce((acc, value) => acc.plus(String(value)), new BigNumber(0))
    .toNumber();
}

/** A hierarchy root's total, which is what its children sum to. */
function total(
  node: SerializableTreeNodePublic | null | undefined,
  currency: string,
): number {
  if (!node) return 0;
  return sum(
    amount(node.balance_children, currency),
    amount(node.balance, currency),
  );
}

function lastDate(series: readonly { date: string }[]): string | null {
  return series.length > 0 ? series[series.length - 1].date : null;
}

export function summarizeBalanceSheet(
  data: BalanceSheetDataPublic,
  conversion?: string,
): BalanceSheetSummary {
  const currency = resolveCurrency(
    currencyEvidence(
      [
        ...data.net_worth_data.map((point) => point.balance),
        data.assets_hierarchy_data?.balance_children ?? {},
      ],
      () => [
        ...ownBalances(data.assets_hierarchy_data),
        ...ownBalances(data.liabilities_hierarchy_data),
        ...ownBalances(data.equity_hierarchy_data),
      ],
    ),
    requestedCurrency(conversion),
  );
  const assets = total(data.assets_hierarchy_data, currency);
  const liabilities = total(data.liabilities_hierarchy_data, currency);
  const equity = total(data.equity_hierarchy_data, currency);
  const requested = requestedCurrency(conversion);
  const others = otherCurrencies(
    [
      ...rootBalances(data.assets_hierarchy_data),
      ...rootBalances(data.liabilities_hierarchy_data),
    ],
    currency,
  );
  return {
    asOf: lastDate(data.net_worth_data),
    currency,
    valuation:
      conversion === "units" || (requested && currency !== requested)
        ? "units"
        : conversion === "at_cost"
          ? "cost"
          : "latest-price",
    ...others,
    ...missingPrices(requested, currency, namesOf(others)),
    assets,
    liabilities,
    equity,
    // From the trees, never the net-worth series: the ledger values each
    // series point at its interval end but the trees at the latest price, so
    // under a historical filter the series point belongs to a different
    // snapshot than the accounts this summary reports (w6/009).
    netWorth: sum(assets, liabilities),
    byAccount: [
      ...flattenHierarchy(data.assets_hierarchy_data, currency),
      ...flattenHierarchy(data.liabilities_hierarchy_data, currency),
      ...flattenHierarchy(data.equity_hierarchy_data, currency),
    ],
  };
}

export function summarizeIncomeStatement(
  data: IncomeStatementDataPublic,
  conversion?: string,
  time?: string,
): IncomeStatementSummary {
  const currency = resolveCurrency(
    [
      ...data.net_profit_data.map((point) => point.balance),
      data.income_hierarchy_data?.balance_children ?? {},
    ],
    requestedCurrency(conversion),
  );
  const income = total(data.income_hierarchy_data, currency);
  const expenses = total(data.expenses_hierarchy_data, currency);
  const others = otherCurrencies(
    [
      ...rootBalances(data.income_hierarchy_data),
      ...rootBalances(data.expenses_hierarchy_data),
    ],
    currency,
    -1,
  );
  return {
    period: {
      from: null,
      to: lastDate(data.net_profit_data),
      time: time ?? null,
    },
    currency,
    income,
    expenses,
    // Beancount signs income negative and expenses positive, so the profit is
    // their sum — not their difference, which would double the loss.
    net: -sum(income, expenses),
    ...others,
    ...missingPrices(requestedCurrency(conversion), currency, namesOf(others)),
    byAccount: [
      ...flattenHierarchy(data.income_hierarchy_data, currency),
      ...flattenHierarchy(data.expenses_hierarchy_data, currency),
    ],
  };
}

export function summarizeOverview(
  data: OverviewPublic,
  conversion?: string,
): OverviewSummary {
  const currency = resolveCurrency(
    data.net_worth_data.map((point) => point.balance),
    requestedCurrency(conversion),
  );
  const series = data.net_worth_data.map((point) => ({
    date: point.date,
    netWorth: amount(point.balance, currency),
  }));
  const others = otherCurrencies(
    [data.net_worth_data.at(-1)?.balance],
    currency,
  );
  return {
    currency,
    netWorth: series.length > 0 ? series[series.length - 1].netWorth : 0,
    ...others,
    ...missingPrices(requestedCurrency(conversion), currency, namesOf(others)),
    series,
  };
}

export function summarizeIntervalTotals(
  data: readonly DateAndBalanceWithAccountBalancePublic[],
  conversion?: string,
): IntervalTotalsSummary {
  const currency = resolveCurrency(
    currencyEvidence(
      data.map((point) => point.balance),
      () =>
        data.flatMap((point) => Object.values(point.account_balances ?? {})),
    ),
    requestedCurrency(conversion),
  );
  const rows = data.map((point) => ({
    point,
    others: otherCurrencies([point.balance], currency),
  }));
  return {
    currency,
    ...missingPrices(
      requestedCurrency(conversion),
      currency,
      rows.flatMap(({ others }) => namesOf(others)),
    ),
    intervals: rows.map(({ point, others }) => ({
      period: point.date,
      total: amount(point.balance, currency),
      ...others,
      byAccount: Object.entries(point.account_balances ?? {})
        .map(([account, balance]) => ({
          account,
          balance: amount(balance, currency),
        }))
        .filter((entry) => entry.balance !== 0),
    })),
  };
}
