import { AccountReportQuery } from "@/generated-graphql/graphql";
import { resolveCurrencyBalance } from "../../../common/balance-util";
import {
  SeriesPoint,
  latestBalance,
  carryBalanceToToday,
  forwardFillMonths,
  pointsToMonthlySeries,
} from "../../../common/series-util";
import {
  amountIn,
  selectBalanceDisplay,
  type BalanceDisplay,
  type BalanceMap,
} from "../../../common/balance-display";
import { addExact } from "../../multi-postings-transaction/postings-utils";
import {
  selectValuation,
  valueBasisOf,
  type ManagedSource,
  type PricePair,
} from "../../../common/valuation";

/**
 * How the account's figures read (see `selectBalanceDisplay`), from the latest
 * point of its market report and of the same report read in units.
 *
 * `current` is the account's balance in the market-valued trial balance, the
 * figure its Accounts row shows at the ledger's latest price. (The report's
 * latest point is valued at the price of its own date — the account's last
 * change — which for a holding left alone for months is an old one.) Any
 * balance reads at it when known, and the balance series ends on it; a money
 * total carries what it discloses about its basis (see `selectValuation`).
 */
export function selectAccountBalanceDisplay(
  currency: string,
  valued: AccountReportQuery | undefined,
  units: AccountReportQuery | undefined,
  prices: readonly PricePair[] | undefined,
  today: string,
  current?: BalanceMap,
  managed?: readonly ManagedSource[],
): BalanceDisplay {
  const points = valued?.getLedgerAccountReport?.linechartData;
  const latest = points?.[points.length - 1];
  const unitsBalance = latestBalance(
    units?.getLedgerAccountReport?.linechartData,
  );
  // Today's value when the trial balance has it, as the Accounts row reads,
  // for every kind of balance. Only a single commodity used it: a mixed
  // brokerage showing $1,250 there opened on the $1,000 its last posting was
  // priced at (w21/179). Without it, the report's latest point, dated so.
  const hasCurrent = current !== undefined && current !== null;
  const display = selectBalanceDisplay(
    hasCurrent ? current : latest?.balance,
    unitsBalance,
    currency,
    valueBasisOf(prices, currency, hasCurrent ? undefined : latest?.date),
  );
  // A commodity's figure discloses its prices as a total's does: a holding
  // left on a stale price, or one priced only in its cost currency, says so
  // (w21/426).
  return {
    ...display,
    valuation: selectValuation({
      market: hasCurrent ? current : latest?.balance,
      units: unitsBalance,
      currency,
      date: hasCurrent ? today : latest?.date,
      today,
      prices,
      managed,
    }),
  };
}

/**
 * An account's balance history in one commodity's units, from its report read
 * with `conversion: "units"`. Read strictly: a month holding none of the
 * commodity is zero, never the cash `resolveCurrencyBalance` would fall back to.
 */
export function selectAccountUnitsSeries(
  commodity: string,
  data?: AccountReportQuery,
  today?: string,
): SeriesPoint[] {
  const points = data?.getLedgerAccountReport?.linechartData;
  const series = startingFromZero(
    forwardFillMonths(
      pointsToMonthlySeries(
        commodity,
        // Postings dated after today have not happened: a buy pre-entered for
        // next month stood in for this month's balance (w21/517).
        today === undefined
          ? points
          : points?.filter((point) => point.date <= today),
        (balance, currency) => amountIn(balance, currency).number,
      ),
    ),
  );
  // Held units are the same until the next posting, so a quiet commodity
  // account reads unchanged over a recent window (w21/240).
  return today === undefined
    ? series
    : startingFromZero(carryBalanceToToday(series, today));
}

/** More significant digits than a double holds (see `amountIn`). */
const needsExact = (text: string) =>
  text.replace(/\D/g, "").replace(/^0+/, "").length > 15;
const negated = (text: string) =>
  text.startsWith("-") ? text.slice(1) : `-${text}`;

/**
 * The ledger's own digits for each figure a units chart shows at rest that a
 * double cannot hold: each point's balance, and the latest balance's change
 * since each point. Keyed by the double the chart computes for it, so its
 * formatter can print them: 18 decimals of ETH read "1.234567890123460000"
 * where the Accounts row read "1.234567890123456789" (w21/782).
 */
export function selectAccountUnitsExactFigures(
  commodity: string,
  data?: AccountReportQuery,
  today?: string,
): Map<number, string> {
  const figures = new Map<number, string>();
  const amounts = (data?.getLedgerAccountReport?.linechartData ?? [])
    .filter((point) => today === undefined || point.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((point) => amountIn(point.balance as BalanceMap, commodity));
  if (!amounts.some((amount) => amount.exact !== undefined)) return figures;
  const decimal = (amount: (typeof amounts)[number]) =>
    amount.exact ?? amount.number.toFixed(amount.scale);
  const latest = amounts[amounts.length - 1]!;
  for (const amount of amounts) {
    if (amount.exact !== undefined) figures.set(amount.number, amount.exact);
    const change = addExact(decimal(latest), negated(decimal(amount)));
    if (needsExact(change)) figures.set(latest.number - amount.number, change);
  }
  // The latest point's own figure wins a collision.
  if (latest.exact !== undefined) figures.set(latest.number, latest.exact);
  return figures;
}

/**
 * The decimal places a units chart needs: the widest any point was recorded
 * with. The latest balance alone could be a round "1000" after 999.50 + 0.50,
 * which then showed August's 0.5 as "1" (w21/125).
 */
export function selectAccountUnitsScale(
  commodity: string,
  data?: AccountReportQuery,
): number {
  return (data?.getLedgerAccountReport?.linechartData ?? []).reduce(
    (widest, point) =>
      Math.max(
        widest,
        amountIn(point.balance as Record<string, string>, commodity).scale,
      ),
    0,
  );
}

/**
 * A series of one point starts its line at 0: the point before the first posting
 * is the end of the month earlier, so an account first funded this month still
 * has two points to draw (w21/893).
 */
function startingFromZero(series: SeriesPoint[]): SeriesPoint[] {
  const first = series[0];
  if (series.length !== 1 || !first || first.value === 0) return series;
  const [year, month] = first.date.split("-").map(Number);
  const before = new Date(Date.UTC(year!, month! - 1, 0))
    .toISOString()
    .slice(0, 10);
  return [{ date: before, value: 0 }, ...series];
}

type DatedBalance = { date: string; balance: unknown };

/**
 * The dense month-end rows, cut to the account and to today. They are dated at
 * each period's last day and run over the ledger's whole span, whichever
 * account is asked about, so they would start months before the account's first
 * posting, end on a day that has not happened, and run into next month for
 * every account as soon as one entry anywhere is pre-entered (w21/491). Rows
 * before the month of the account's first posting go, rows after the current
 * month go, and the current month's row is dated today.
 */
function boundedMonthEnds<T extends DatedBalance>(
  monthEnds: readonly T[],
  changes: readonly DatedBalance[] | undefined,
  day: string | undefined,
): T[] {
  const firstMonth = changes?.[0]?.date.slice(0, 7);
  const thisMonth = day?.slice(0, 7);
  return monthEnds
    .filter((point) => {
      const month = point.date.slice(0, 7);
      return (
        (firstMonth === undefined || month >= firstMonth) &&
        (thisMonth === undefined || month <= thisMonth)
      );
    })
    .map((point) =>
      day !== undefined &&
      point.date.slice(0, 7) === day.slice(0, 7) &&
      point.date > day
        ? { ...point, date: day }
        : point,
    );
}

/**
 * Convert an account report's monthly `linechartData` into a chart series in
 * the active currency: one (most recent) point per month, ascending by date.
 * Signed — an account balance can be negative (e.g. liabilities/credit cards).
 */
export function selectAccountBalanceSeries(
  currency: string,
  data?: AccountReportQuery,
  current?: { balance: BalanceMap; today: string },
  today?: string,
): SeriesPoint[] {
  // The month-end balances, each valued at its own month-end prices. The
  // change-only `linechartData` is valued at the date of the posting, so a
  // holding left alone drew flat through every price move and then jumped to
  // today's value (w21/420). It stays the fallback for a report without them.
  const report = data?.getLedgerAccountReport;
  const monthEnds = report?.accountBalanceData;
  const day = current?.today ?? today;
  // The ledger sends a point only where the balance changed (w21/164).
  const series = forwardFillMonths(
    pointsToMonthlySeries(
      currency,
      monthEnds?.length
        ? boundedMonthEnds(monthEnds, report?.linechartData, day)
        : report?.linechartData,
    ),
  );
  const last = series[series.length - 1];
  // Without today's value (an account the trial balance does not list), the
  // last balance still holds until today (w21/240).
  if (!current)
    return today === undefined ? series : carryBalanceToToday(series, today);
  if (last && last.date > current.today) return series;
  // The chart's headline is its last point, priced on the account's last
  // change; end it on today's value, as the Accounts row reads (w21/179).
  const now = {
    date: current.today,
    // Read like every other point of the series.
    value: resolveCurrencyBalance(current.balance, currency),
  };
  // An account whose only postings are still to come has no point up to today,
  // yet the row lists its balance: the header ends on that figure rather than
  // falling back to $0.00 (w21/516).
  if (!last) return now.value === 0 ? series : [now];
  return last.date.slice(0, 7) === current.today.slice(0, 7)
    ? [...startingFromZero(series).slice(0, -1), now]
    : forwardFillMonths([...series, now]);
}
