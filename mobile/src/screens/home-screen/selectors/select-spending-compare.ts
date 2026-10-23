import { resolveCurrencyBalance } from "../../../common/balance-util";
import { notInTotalOf, type Holding } from "../../../common/balance-display";
import { formatSignedMoneyWithCurrency } from "../../../common/number-utils";
import { formatTimeFilter } from "../../transactions-screen/filters/select-filter-query";

export type SpendingCompare = {
  thisMonth: number;
  lastMonth: number;
  /**
   * This month's spending in other currencies, which the bars cannot include:
   * the card used to read "This month $0" over a 50 EUR expense with no hint
   * (w21/038). Per month: netted with last month's, a refund last month hid
   * this month's spending, and 80 EUR spent against a 30 EUR refund read "50
   * EUR", which neither month spent (w21/263).
   */
  notInTotal: Holding[];
  /** Last month's, disclosed on its own line when it has any. */
  lastMonthNotInTotal: Holding[];
  thisMonthKey: string;
  lastMonthKey: string;
};

/** One month of the Expenses root's activity, as `getLedgerIntervalTotals` returns it. */
export type MonthTotal = {
  /** A date inside the month. */
  date: string;
  balance: Record<string, number | string> | null | undefined;
};

/** Format a year + 1-based month as a "YYYY-MM" key. */
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthKeys(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // 1-based
  return {
    thisMonthKey: toMonthKey(year, month),
    lastMonthKey:
      month === 1 ? toMonthKey(year - 1, 12) : toMonthKey(year, month - 1),
  };
}

/**
 * The `time` window the card asks for: the first of last month through the end
 * of this one. Both months come back whole however many transactions they
 * hold (w21/011). The window is the same all month: ending it on today made
 * a new cache key every day, so the next day offline found yesterday's result
 * unreadable and the card failed to load (w21/184).
 */
export function spendingWindow(referenceDate: Date = new Date()): string {
  const { lastMonthKey, thisMonthKey } = monthKeys(referenceDate);
  const lastDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
  ).getDate();
  return formatTimeFilter({
    start: `${lastMonthKey}-01`,
    end: `${thisMonthKey}-${String(lastDay).padStart(2, "0")}`,
  });
}

/**
 * Spending this month vs. last month in the active currency, from the
 * Expenses root's monthly totals (sub-accounts rolled up server-side). The
 * card used to sum the newest 200 journal rows, so a month with more
 * transactions than that hid last month's spending entirely and capped this
 * month's (w21/011). `referenceDate` is injectable for deterministic tests.
 */
export function selectSpendingCompare(
  months: readonly MonthTotal[],
  currency: string,
  referenceDate: Date = new Date(),
): SpendingCompare {
  const { thisMonthKey, lastMonthKey } = monthKeys(referenceDate);
  let thisMonth = 0;
  let lastMonth = 0;
  const omittedThis = new Map<string, Holding>();
  const omittedLast = new Map<string, Holding>();
  for (const month of months) {
    const key = month.date.slice(0, 7);
    if (key !== thisMonthKey && key !== lastMonthKey) continue;
    const spent = resolveCurrencyBalance(month.balance, currency);
    const omitted = key === thisMonthKey ? omittedThis : omittedLast;
    if (key === thisMonthKey) thisMonth += spent;
    else lastMonth += spent;
    // Within one month, entries of one currency still add up.
    for (const holding of notInTotalOf(month.balance, currency)) {
      const prior = omitted.get(holding.currency);
      const scale = Math.max(prior?.scale ?? 0, holding.scale);
      omitted.set(holding.currency, {
        currency: holding.currency,
        scale,
        number: Number(((prior?.number ?? 0) + holding.number).toFixed(scale)),
      });
    }
  }
  const nonZero = (held: Map<string, Holding>) =>
    [...held.values()].filter((holding) => holding.number !== 0);
  const notInTotal = nonZero(omittedThis);
  const lastMonthNotInTotal = nonZero(omittedLast);
  return {
    thisMonth,
    lastMonth,
    notInTotal,
    lastMonthNotInTotal,
    thisMonthKey,
    lastMonthKey,
  };
}

/**
 * The Spending chart as one spoken sentence — both months and their amounts —
 * since its bars and axis ticks are not readable on their own (w21/018).
 */
export function spendingChartSummary(
  { lastMonth, thisMonth }: Pick<SpendingCompare, "lastMonth" | "thisMonth">,
  currency: string,
  t: (key: "spendingChartSummary", params: Record<string, string>) => string,
  /** The card's "Not in total" line, spoken after the amounts (w21/038). */
  note?: string,
): string {
  const summary = t("spendingChartSummary", {
    // Signed: a net-refund month is negative spending, not spending (w21/494).
    lastMonth: formatSignedMoneyWithCurrency(lastMonth, currency),
    thisMonth: formatSignedMoneyWithCurrency(thisMonth, currency),
  });
  return note ? `${summary}. ${note}` : summary;
}

/**
 * The two monthly totals as text under the bars, "This month $1,234.56 · Last
 * month $987.65": the exact amounts were only in the VoiceOver label, and a
 * sighted reader had the bars and short ticks (w21/418). `isolate` keeps an
 * amount's characters in order inside right-to-left text.
 */
export function spendingTotalsCaption(
  { lastMonth, thisMonth }: Pick<SpendingCompare, "lastMonth" | "thisMonth">,
  currency: string,
  labels: { thisMonth: string; lastMonth: string },
  isolate: (text: string) => string = (text) => text,
): string {
  const amount = (value: number) =>
    isolate(formatSignedMoneyWithCurrency(value, currency));
  return `${labels.thisMonth} ${amount(thisMonth)} · ${labels.lastMonth} ${amount(lastMonth)}`;
}

/**
 * Whether neither month has any spending at all: none in the card's currency
 * and none held back as not in the total. A month spent only in another
 * currency is not "No spending yet" (w21/493).
 */
export function noSpending({
  lastMonth,
  thisMonth,
  notInTotal = [],
  lastMonthNotInTotal = [],
}: Pick<SpendingCompare, "lastMonth" | "thisMonth"> &
  Partial<
    Pick<SpendingCompare, "notInTotal" | "lastMonthNotInTotal">
  >): boolean {
  return (
    lastMonth === 0 &&
    thisMonth === 0 &&
    notInTotal.length === 0 &&
    lastMonthNotInTotal.length === 0
  );
}

/**
 * Whether the ledger has spent at all, from its monthly Expenses totals over
 * its whole span: any month with an amount in any currency. Null until they
 * are read. "No spending yet" was said of a ledger whose spending stopped in
 * August whenever this month and last were empty, where "No spending this
 * month or last month" is what is known (w21/789).
 */
export function everSpent(
  months: readonly { balance?: unknown }[] | undefined,
): boolean | null {
  if (months === undefined) return null;
  return months.some(({ balance }) =>
    Object.values(
      typeof balance === "object" && balance !== null
        ? (balance as Record<string, unknown>)
        : {},
    ).some((value) => Number(value) !== 0 && Number.isFinite(Number(value))),
  );
}
