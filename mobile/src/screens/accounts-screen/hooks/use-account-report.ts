import { useAccountReportQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Pinned for offline cold start — see m34 fetch-policy audit. */
export const ACCOUNT_REPORT_FETCH_POLICY = "cache-and-network" as const;

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
    fetchPolicy: ACCOUNT_REPORT_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
