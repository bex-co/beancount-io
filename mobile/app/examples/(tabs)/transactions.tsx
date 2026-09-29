import { TransactionsScreen } from "@/screens/transactions-screen/transactions-screen";
import { ExampleTabScreen } from "@/screens/examples/example-tabs";

export default function PreviewTab() {
  return (
    <ExampleTabScreen view="transactions">
      <TransactionsScreen />
    </ExampleTabScreen>
  );
}
