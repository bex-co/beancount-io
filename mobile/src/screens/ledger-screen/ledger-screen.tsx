import { LedgerGuard } from "@/components/ledger-guard";
import { LedgerFileBrowserScreen } from "@/screens/ledger-file-browser-screen";

export const LedgerScreen = () => {
  return (
    <LedgerGuard>
      <LedgerFileBrowserScreen />
    </LedgerGuard>
  );
};
