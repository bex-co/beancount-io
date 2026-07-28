import { LedgerGuard } from "@/components/ledger-guard";
import { OpenAccountScreenComponent } from "./open-account-screen";

export function OpenAccountScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <OpenAccountScreenComponent />
    </LedgerGuard>
  );
}
