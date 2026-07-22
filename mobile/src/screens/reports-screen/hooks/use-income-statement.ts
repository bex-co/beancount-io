import { useIncomeStatementQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Holdings are valued per {@link BALANCE_CONVERSION}; see that constant for why
 * leaving `conversion` unset silently returns raw share counts. */
export const useIncomeStatement = (
  ledgerId: string,
  time?: string,
  interval?: string,
) => {
  const { loading, data, error, refetch } = useIncomeStatementQuery({
    variables: { ledgerId, time, interval, conversion: BALANCE_CONVERSION },
    skip: !ledgerId,
    fetchPolicy: "network-only",
  });
  return { loading, data, error, refetch };
};
