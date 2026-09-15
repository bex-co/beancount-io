import { AccountReportQuery } from "@/generated-graphql/graphql";
import {
  SeriesPoint,
  latestBalance,
  pointsToMonthlySeries,
} from "../../../common/series-util";
import {
  amountIn,
  selectBalanceDisplay,
  type BalanceDisplay,
} from "../../../common/balance-display";

/**
 * How the account's figures read (see `selectBalanceDisplay`), from the latest
 * point of its at-cost report and of the same report read in units.
 */
export function selectAccountBalanceDisplay(
  currency: string,
  atCost?: AccountReportQuery,
  units?: AccountReportQuery,
): BalanceDisplay {
  return selectBalanceDisplay(
    latestBalance(atCost?.getLedgerAccountReport?.linechartData),
    latestBalance(units?.getLedgerAccountReport?.linechartData),
    currency,
  );
}

/**
 * An account's balance history in one commodity's units, from its report read
 * with `conversion: "units"`. Read strictly: a month holding none of the
 * commodity is zero, never the cash `resolveCurrencyBalance` would fall back to.
 */
export function selectAccountUnitsSeries(
  commodity: string,
  data?: AccountReportQuery,
): SeriesPoint[] {
  return pointsToMonthlySeries(
    commodity,
    data?.getLedgerAccountReport?.linechartData,
    (balance, currency) => amountIn(balance, currency).number,
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
): SeriesPoint[] {
  return pointsToMonthlySeries(
    currency,
    data?.getLedgerAccountReport?.linechartData,
  );
}
