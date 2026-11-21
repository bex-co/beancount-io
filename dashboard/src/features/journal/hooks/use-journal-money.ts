import { useMemo } from "react";
import { useLedger } from "@/common/hooks/use-ledger";
import type { JournalMoney } from "@/features/journal/components/journal-days";

/**
 * What each journal row needs to say how much moved, in the ledger's own
 * names: Beancount's root names where the ledger has not renamed them.
 * `accountFilter` is the account a row reports its share of, if any.
 */
export function useJournalMoney(accountFilter: string): JournalMoney {
  const { primaryCurrency, ledgerData } = useLedger();
  const incomeRoot = ledgerData?.options?.nameIncome || "Income";
  const expensesRoot = ledgerData?.options?.nameExpenses || "Expenses";
  return useMemo(
    () => ({ primaryCurrency, incomeRoot, expensesRoot, accountFilter }),
    [accountFilter, expensesRoot, incomeRoot, primaryCurrency],
  );
}
