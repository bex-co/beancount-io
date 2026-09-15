import { useTrialBalanceQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Pinned for offline cold start — see m34 fetch-policy audit. */
const TRIAL_BALANCE_FETCH_POLICY = "cache-and-network" as const;

/**
 * Trial balance for a ledger: all five root categories with their account trees,
 * commodity holdings valued per {@link BALANCE_CONVERSION}. This is the query the
 * web dashboard's all-accounts table uses, and the only account hierarchy that
 * takes a conversion at all — `accountHierarchy` reports raw per-currency
 * balances, which silently omits every non-cash holding. The Accounts tab also
 * reads it with `conversion: "units"` to see what each commodity account holds.
 */
export const useTrialBalance = (
  ledgerId: string,
  time?: string,
  conversion: string = BALANCE_CONVERSION,
) => {
  const { loading, data, error, refetch } = useTrialBalanceQuery({
    variables: { ledgerId, time, conversion },
    skip: !ledgerId,
    fetchPolicy: TRIAL_BALANCE_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
