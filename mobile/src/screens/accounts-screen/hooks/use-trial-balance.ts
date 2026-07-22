import { useTrialBalanceQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/**
 * Trial balance for a ledger: all five root categories with their account trees,
 * commodity holdings valued per {@link BALANCE_CONVERSION}. This is the query the
 * web dashboard's all-accounts table uses, and the only account hierarchy that
 * takes a conversion at all — `accountHierarchy` reports raw per-currency
 * balances, which silently omits every non-cash holding.
 */
export const useTrialBalance = (ledgerId: string, time?: string) => {
  const { loading, data, error, refetch } = useTrialBalanceQuery({
    variables: { ledgerId, time, conversion: BALANCE_CONVERSION },
    skip: !ledgerId,
    fetchPolicy: "network-only",
  });
  return { loading, data, error, refetch };
};
