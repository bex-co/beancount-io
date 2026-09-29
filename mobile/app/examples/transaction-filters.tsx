import { TransactionFiltersScreen } from "@/screens/transaction-filters-screen/transaction-filters-screen";
import { ExampleReadScreen } from "@/screens/examples/example-ledger-provider";
import { LedgerGuard } from "@/components/ledger-guard";

export default function PreviewDetail() {
  return (
    <ExampleReadScreen>
      <LedgerGuard>
        <TransactionFiltersScreen />
      </LedgerGuard>
    </ExampleReadScreen>
  );
}
