import { AccountReportQuery } from "@/generated-graphql/graphql";
import {
  SeriesPoint,
  pointsToMonthlySeries,
} from "../../../common/series-util";

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
