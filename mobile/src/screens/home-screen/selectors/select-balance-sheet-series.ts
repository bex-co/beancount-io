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
 * valued at the ledger's latest prices. Home names what a
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
  // The point of today's month, like the curves: the series runs on into
  // months with entries booked for later (w21/665).
  return selectValuation({
    market: latestBalance(market?.getLedgerBalanceSheet?.[series], today),
    cost: latestBalance(basis?.cost?.[series], today),
    units: latestBalance(basis?.units?.[series], today),
    currency,
    // No valuation date: the latest point is today's standing, valued at the
    // ledger's latest prices as the Accounts tree is, so price age is measured
    // against today. Against the point's date — the month-end of the last
    // activity — a ledger idle since September never showed a stale price
    // (w21/209).
    date: undefined,
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
