import {
  BalanceSheetBasisQuery,
  BalanceSheetQuery,
} from "@/generated-graphql/graphql";
import {
  SeriesPoint,
  latestBalance,
  pointsToMonthlySeries,
} from "../../../common/series-util";
import {
  selectValuation,
  type ManagedSource,
  type PricePair,
  type Valuation,
} from "../../../common/valuation";

/** Home's three curves, named the way both balance-sheet reads name them. */
export type SheetSeries = "netWorthData" | "assetsData" | "liabilitiesData";

/**
 * What the latest point of one Home curve discloses (see `selectValuation`):
 * its market figure, measured against the same point at cost and in units, and
 * dated by the ledger's prices at the point's own date. Home names what a
 * total holds rather than presenting a net worth whose basis the reader has to
 * guess.
 */
export function selectSeriesValuation(
  currency: string,
  series: SheetSeries,
  market: BalanceSheetQuery | undefined,
  basis: BalanceSheetBasisQuery | undefined,
  prices: readonly PricePair[] | undefined,
  today: string,
  managed?: readonly ManagedSource[],
): Valuation {
  const points = market?.getLedgerBalanceSheet?.[series];
  const latest = points?.[points.length - 1];
  return selectValuation({
    market: latest?.balance,
    cost: latestBalance(basis?.cost?.[series]),
    units: latestBalance(basis?.units?.[series]),
    currency,
    date: latest?.date,
    today,
    prices,
    managed,
  });
}

/**
 * Monthly net-worth series in the active currency (one point per month,
 * ascending). Signed — net worth can be negative.
 */
export function selectNetWorthSeries(
  currency: string,
  data?: BalanceSheetQuery,
): SeriesPoint[] {
  return pointsToMonthlySeries(
    currency,
    data?.getLedgerBalanceSheet?.netWorthData,
  );
}

/** Monthly Assets balance series in the active currency. */
export function selectAssetsSeries(
  currency: string,
  data?: BalanceSheetQuery,
): SeriesPoint[] {
  return pointsToMonthlySeries(
    currency,
    data?.getLedgerBalanceSheet?.assetsData,
  );
}

/**
 * Monthly Liabilities balance series in the active currency. Kept signed, i.e.
 * negative under beancount's convention (the account lists show `Math.abs`, the
 * chart does not): growing debt then trends downward, which is what the chart's
 * up/down coloring already reads as bad. Matches the web dashboard's balance
 * sheet, which only flips the sign under the `invert-income-liabilities-equity`
 * fava option.
 */
export function selectLiabilitiesSeries(
  currency: string,
  data?: BalanceSheetQuery,
): SeriesPoint[] {
  return pointsToMonthlySeries(
    currency,
    data?.getLedgerBalanceSheet?.liabilitiesData,
  );
}
