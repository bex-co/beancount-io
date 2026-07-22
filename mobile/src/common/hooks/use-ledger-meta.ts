import { useLedgerMetaQuery } from "@/generated-graphql/graphql";
import {
  getAccountsAndCurrency,
  handleOptions,
  type OptionTab,
} from "../ledger-meta-utils";

export type { OptionTab };

export const useLedgerMeta = (userId: string, ledgerId?: string) => {
  const { data, error, loading, refetch } = useLedgerMetaQuery({
    variables: { userId, ledgerId },
    fetchPolicy: "network-only",
  });

  const { assets, expenses, currencies } = getAccountsAndCurrency(
    data?.ledgerMeta.data,
  );

  const assetsOptionTabs = handleOptions(assets);
  const expensesOptionTabs = handleOptions(expenses);

  return {
    data: data?.ledgerMeta.data,
    assets,
    expenses,
    assetsOptionTabs,
    expensesOptionTabs,
    currencies,
    error,
    loading,
    refetch,
  };
};
