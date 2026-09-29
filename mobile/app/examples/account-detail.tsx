import { AccountDetailScreen } from "@/screens/account-detail-screen";
import { ExampleReadScreen } from "@/screens/examples/example-ledger-provider";

export default function PreviewDetail() {
  return (
    <ExampleReadScreen>
      <AccountDetailScreen />
    </ExampleReadScreen>
  );
}
