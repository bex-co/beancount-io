import { useIncomeStatementQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Pinned for offline cold start — see m34 fetch-policy audit. */
const INCOME_STATEMENT_FETCH_POLICY = "cache-and-network" as const;

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
    fetchPolicy: INCOME_STATEMENT_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
