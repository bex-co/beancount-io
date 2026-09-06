import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { EditTransactionScreen } from "@/screens/edit-transaction-screen";

export default function EditTransaction() {
  return (
    <LedgerWriteGuard>
      <EditTransactionScreen />
    </LedgerWriteGuard>
  );
}
