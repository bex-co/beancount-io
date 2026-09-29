import { useMemo } from "react";
import { getAccountsAndCurrency } from "../ledger-meta-utils";
import { useLedgerReadContextQuery } from "@/generated-graphql/graphql";

/** Metadata for ledger reads, available without a user identity. */
export function useLedgerReadContext(ledgerId: string) {
  const result = useLedgerReadContextQuery({
    variables: { ledgerId },
    fetchPolicy: "cache-and-network",
  });
  const ledger = result.data?.getLedger;
  const ordered = useMemo(
    () =>
      getAccountsAndCurrency(
        ledger
          ? {
              accounts: ledger.attributes.accounts,
              options: {
                name_assets: ledger.options.nameAssets,
                name_expenses: ledger.options.nameExpenses,
                name_income: ledger.options.nameIncome,
                name_liabilities: ledger.options.nameLiabilities,
                name_equity: ledger.options.nameEquity,
                operating_currency: ledger.options.operatingCurrency,
              },
            }
          : undefined,
      ),
    [ledger],
  );
  return {
    ...ordered,
    ...result,
    accounts: result.data?.getLedger.attributes.accounts,
  };
}
