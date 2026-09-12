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
 * the one the caller asked to convert to.
 *
 * Those numbers are JSON numbers, not the decimal strings Fava sends, because
 * an agent asked for a total wants something it can compare and add without
 * parsing. The cost is real and bounded: a magnitude past 2^53 rounds. Any
 * caller that needs the exact decimal has `shape=fava`, which never converts.
 */

/** One account and what it holds, in the summary's currency. */
export interface AccountBalance {
  readonly account: string;
  readonly balance: number;
}

export interface BalanceSheetSummary {
  /** Last date the statement covers, or `null` for an empty ledger. */
  readonly asOf: string | null;
  readonly currency: string;
  readonly assets: number;
  readonly liabilities: number;
  readonly equity: number;
  readonly netWorth: number;
  readonly byAccount: readonly AccountBalance[];
}

export interface IncomeStatementSummary {
  readonly period: { readonly from: string | null; readonly to: string | null };
  readonly currency: string;
  readonly income: number;
  readonly expenses: number;
  readonly net: number;
  readonly byAccount: readonly AccountBalance[];
}

export interface OverviewSummary {
  readonly currency: string;
  readonly netWorth: number;
  readonly series: readonly { date: string; netWorth: number }[];
}

interface IntervalTotal {
  readonly period: string;
  readonly total: number;
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
  if (balance !== 0 && node.account) into.push({ account: node.account, balance });
  for (const child of node.children ?? []) {
    flattenHierarchy(child, currency, into);
  }
  return into;
}

/** A hierarchy root's total, which is what its children sum to. */
function total(
  node: SerializableTreeNodePublic | null | undefined,
  currency: string,
): number {
  if (!node) return 0;
  return amount(node.balance_children, currency) + amount(node.balance, currency);
}

function lastDate(series: readonly { date: string }[]): string | null {
  return series.length > 0 ? series[series.length - 1].date : null;
}

export function summarizeBalanceSheet(
  data: BalanceSheetDataPublic,
  conversion?: string,
): BalanceSheetSummary {
  const currency = resolveCurrency(
    [
      ...data.net_worth_data.map((point) => point.balance),
      data.assets_hierarchy_data?.balance_children ?? {},
    ],
    conversion,
  );
  const assets = total(data.assets_hierarchy_data, currency);
  const liabilities = total(data.liabilities_hierarchy_data, currency);
  const equity = total(data.equity_hierarchy_data, currency);
  const last = data.net_worth_data[data.net_worth_data.length - 1];
  return {
    asOf: lastDate(data.net_worth_data),
    currency,
    assets,
    liabilities,
    equity,
    // Prefer the series Fava computed; fall back to the identity when the
    // ledger is too empty to have produced one.
    netWorth: last ? amount(last.balance, currency) : assets + liabilities,
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
): IncomeStatementSummary {
  const currency = resolveCurrency(
    [
      ...data.net_profit_data.map((point) => point.balance),
      data.income_hierarchy_data?.balance_children ?? {},
    ],
    conversion,
  );
  const income = total(data.income_hierarchy_data, currency);
  const expenses = total(data.expenses_hierarchy_data, currency);
  return {
    period: {
      from: data.net_profit_data[0]?.date ?? null,
      to: lastDate(data.net_profit_data),
    },
    currency,
    income,
    expenses,
    // Beancount signs income negative and expenses positive, so the profit is
    // their sum — not their difference, which would double the loss.
    net: -(income + expenses),
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
    conversion,
  );
  const series = data.net_worth_data.map((point) => ({
    date: point.date,
    netWorth: amount(point.balance, currency),
  }));
  return {
    currency,
    netWorth: series.length > 0 ? series[series.length - 1].netWorth : 0,
    series,
  };
}

export function summarizeIntervalTotals(
  data: readonly DateAndBalanceWithAccountBalancePublic[],
  conversion?: string,
): IntervalTotalsSummary {
  const currency = resolveCurrency(
    data.map((point) => point.balance),
    conversion,
  );
  return {
    currency,
    intervals: data.map((point) => ({
      period: point.date,
      total: amount(point.balance, currency),
      byAccount: Object.entries(point.account_balances ?? {})
        .map(([account, balance]) => ({
          account,
          balance: amount(balance, currency),
        }))
        .filter((entry) => entry.balance !== 0),
    })),
  };
}
