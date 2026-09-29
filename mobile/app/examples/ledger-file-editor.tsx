import { LedgerFileEditorScreen } from "@/screens/ledger-file-editor-screen";
import { ExampleReadScreen } from "@/screens/examples/example-ledger-provider";
import { LedgerGuard } from "@/components/ledger-guard";

export default function PreviewDetail() {
  return (
    <ExampleReadScreen>
      <LedgerGuard>
        <LedgerFileEditorScreen />
      </LedgerGuard>
    </ExampleReadScreen>
  );
}
