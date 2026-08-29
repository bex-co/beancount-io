import { TransactionsScreen } from "@/screens/transactions-screen/transactions-screen";
import { LazyTabScreen } from "@/components/lazy-tab-screen";

export default function Transactions() {
  return (
    <LazyTabScreen>
      <TransactionsScreen />
    </LazyTabScreen>
  );
}
