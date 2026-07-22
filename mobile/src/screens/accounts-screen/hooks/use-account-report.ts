import { useAccountReportQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/**
 * Report for a single account: `linechartData` is its balance history over
 * time, `intervalTotalsData` the per-interval change. `time` scopes the range,
 * `interval` the bucketing (monthly by default). Holdings are valued per
 * {@link BALANCE_CONVERSION}, matching the journal below the chart — which
 * already defaulted to it, so the two used to disagree.
 */
export const useAccountReport = (
  ledgerId: string,
  accountName: string,
  time?: string,
  interval = "monthly",
) => {
  const { loading, data, error, refetch } = useAccountReportQuery({
    variables: {
      ledgerId,
      accountName,
      time,
      interval,
      conversion: BALANCE_CONVERSION,
    },
    skip: !ledgerId || !accountName,
    fetchPolicy: "network-only",
  });
  return { loading, data, error, refetch };
};
