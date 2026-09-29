import { LedgerScreen } from "@/screens/ledger-screen/ledger-screen";
import { ExampleTabScreen } from "@/screens/examples/example-tabs";

export default function PreviewTab() {
  return (
    <ExampleTabScreen view="files">
      <LedgerScreen />
    </ExampleTabScreen>
  );
}
