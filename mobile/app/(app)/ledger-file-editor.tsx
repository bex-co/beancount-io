import { LedgerGuard } from "@/components/ledger-guard";
import { LedgerFileEditorScreen } from "@/screens/ledger-file-editor-screen";

export default function LedgerFileEditorRoute() {
  return (
    <LedgerGuard>
      <LedgerFileEditorScreen />
    </LedgerGuard>
  );
}
