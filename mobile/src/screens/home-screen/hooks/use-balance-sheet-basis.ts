import { useBalanceSheetBasisQuery } from "@/generated-graphql/graphql";
import { BALANCE_CONVERSION } from "@/common/balance-util";

/** Same policy as the market read it explains — see m34 fetch-policy audit. */
const BALANCE_SHEET_BASIS_FETCH_POLICY = "cache-and-network" as const;

/**
 * The Home series again, at cost and in units: what Home's market figures are
 * measured against. The cost read is the cost basis beside Net Worth; the units
 * read says which commodities each total holds, so its caption can say which
 * it priced (see `selectValuation`).
 */
export const useBalanceSheetBasis = (ledgerId: string) => {
  const { loading, data, error, refetch } = useBalanceSheetBasisQuery({
    variables: {
      ledgerId,
      costConversion: BALANCE_CONVERSION,
      unitsConversion: "units",
    },
    skip: !ledgerId,
    fetchPolicy: BALANCE_SHEET_BASIS_FETCH_POLICY,
  });
  return { loading, data, error, refetch };
};
