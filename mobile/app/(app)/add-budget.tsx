import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { AddBudgetScreen } from "@/screens/add-budget-screen";

export default function AddBudget() {
  return (
    <LedgerWriteGuard>
      <AddBudgetScreen />
    </LedgerWriteGuard>
  );
}
