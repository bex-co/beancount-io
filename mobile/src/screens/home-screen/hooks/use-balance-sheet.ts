import { useBalanceSheetQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Pinned for offline cold start — see m34 fetch-policy audit. */
const BALANCE_SHEET_FETCH_POLICY = "cache-and-network" as const;

/**
 * Balance sheet for a ledger: net-worth / assets / liabilities series plus the
 * assets & liabilities hierarchy trees, with commodity holdings valued per
 * {@link BALANCE_CONVERSION}. `time` scopes the series (e.g. a Fava-style range
 * string); omit it for the full history the range pills slice.
 */
export const useBalanceSheet = (ledgerId: string, time?: string) => {
  const { loading, data, error, refetch } = useBalanceSheetQuery({
    variables: { ledgerId, time, conversion: BALANCE_CONVERSION },
    skip: !ledgerId,
    fetchPolicy: BALANCE_SHEET_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
