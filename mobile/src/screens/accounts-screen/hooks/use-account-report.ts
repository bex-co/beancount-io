import { useAccountReportQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Pinned for offline cold start — see m34 fetch-policy audit. */
const ACCOUNT_REPORT_FETCH_POLICY = "cache-and-network" as const;

/**
 * Report for a single account: `linechartData` is its balance history over
 * time, the only series the app reads. `time` scopes the range,
 * `interval` the bucketing (monthly by default). Holdings are valued per
 * {@link BALANCE_CONVERSION}, matching the journal below the chart — which
 * already defaulted to it, so the two used to disagree. Account detail also
 * reads it with `conversion: "units"` to see what the account holds.
 */
export const useAccountReport = (
  ledgerId: string,
  accountName: string,
  time?: string,
  interval = "monthly",
  conversion: string = BALANCE_CONVERSION,
) => {
  const { loading, data, error, refetch } = useAccountReportQuery({
    variables: {
      ledgerId,
      accountName,
      time,
      interval,
      conversion,
    },
    skip: !ledgerId || !accountName,
    fetchPolicy: ACCOUNT_REPORT_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
