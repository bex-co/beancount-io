import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { OpenAccountScreen } from "@/screens/open-account-screen";

export default function OpenAccount() {
  return (
    <LedgerWriteGuard>
      <OpenAccountScreen />
    </LedgerWriteGuard>
  );
}
