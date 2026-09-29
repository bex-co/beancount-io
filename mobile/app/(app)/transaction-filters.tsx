import { LedgerGuard } from "@/components/ledger-guard";
import { TransactionFiltersScreen } from "@/screens/transaction-filters-screen/transaction-filters-screen";

export default function TransactionFilters() {
  return (
    <LedgerGuard>
      <TransactionFiltersScreen />
    </LedgerGuard>
  );
}
