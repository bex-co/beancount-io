import { BalanceSheetQuery } from "@/generated-graphql/graphql";
import {
  DateBalancePoint,
  SeriesPoint,
  latestBalance,
  pointsToMonthlySeries,
} from "../../../common/series-util";
import { notInTotalOf, type Holding } from "../../../common/balance-display";

/**
 * Holdings the latest point of a series leaves out of its operating-currency
 * total — commodities with no cost, which the at-cost total cannot express.
 * Home names them rather than presenting a net worth that silently omits them.
 */
export function selectLatestNotInTotal(
  currency: string,
  points: ReadonlyArray<DateBalancePoint | null | undefined> | null | undefined,
): Holding[] {
  return notInTotalOf(latestBalance(points), currency);
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
