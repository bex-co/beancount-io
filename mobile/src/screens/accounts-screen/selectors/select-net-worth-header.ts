import { BalanceSheetQuery } from "@/generated-graphql/graphql";
import {
  SeriesPoint,
  pointsToMonthlySeries,
} from "../../../common/series-util";

/**
 * Convert the balance sheet's monthly `netWorthData` into a chart series in the
 * active currency: one (most recent) point per month, ascending by date. Signed
 * — net worth can be negative.
 */
export function selectNetWorthHeaderSeries(
  currency: string,
  data?: BalanceSheetQuery,
): SeriesPoint[] {
  return pointsToMonthlySeries(
    currency,
    data?.getLedgerBalanceSheet?.netWorthData,
  );
}
