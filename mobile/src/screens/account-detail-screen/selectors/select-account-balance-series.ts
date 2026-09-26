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
  type BalanceMap,
} from "../../../common/balance-display";
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
 * One commodity reads in its units, so its value is free to be the current one:
 * `current` is the account's balance in the market-valued trial balance, the
 * figure its Accounts row shows at the ledger's latest price. (The report's
 * latest point is valued at the price of its own date — the account's last
 * change — which for a holding left alone for months is an old one.)
 *
 * Any other balance is the chart's headline, the report's latest point, so it
 * carries what that total discloses about its basis (see `selectValuation`),
 * dated like that point.
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
  const display = selectBalanceDisplay(
    latest?.balance,
    unitsBalance,
    currency,
    valueBasisOf(prices, currency, latest?.date),
  );
  if (display.kind === "units") {
    return current === undefined || current === null
      ? display
      : selectBalanceDisplay(
          current,
          unitsBalance,
          currency,
          valueBasisOf(prices, currency),
        );
  }
  return {
    ...display,
    valuation: selectValuation({
      market: latest?.balance,
      units: unitsBalance,
      currency,
      date: latest?.date,
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
