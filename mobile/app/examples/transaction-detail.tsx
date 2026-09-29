import { TransactionDetailScreen } from "@/screens/transaction-detail-screen";
import { ExampleReadScreen } from "@/screens/examples/example-ledger-provider";

export default function PreviewDetail() {
  return (
    <ExampleReadScreen>
      <TransactionDetailScreen />
    </ExampleReadScreen>
  );
}
