import { useAccountReportQuery } from "@/generated-graphql/graphql";

/**
 * Report for a single account: `linechartData` is its balance history over
 * time, `intervalTotalsData` the per-interval change. `time` scopes the range,
 * `interval` the bucketing (monthly by default).
 */
export const useAccountReport = (
  ledgerId: string,
  accountName: string,
  time?: string,
  interval = "monthly",
) => {
  const { loading, data, error, refetch } = useAccountReportQuery({
    variables: { ledgerId, accountName, time, interval },
    skip: !ledgerId || !accountName,
    fetchPolicy: "network-only",
  });
  return { loading, data, error, refetch };
};
