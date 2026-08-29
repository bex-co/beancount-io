import { LedgerScreen } from "@/screens/ledger-screen/ledger-screen";
import { LazyTabScreen } from "@/components/lazy-tab-screen";

export default function Ledger() {
  return (
    <LazyTabScreen>
      <LedgerScreen />
    </LazyTabScreen>
  );
}
