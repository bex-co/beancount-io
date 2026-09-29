import { AccountPickerScreen } from "@/screens/account-picker-screen/account-picker-screen";
import { ExampleReadScreen } from "@/screens/examples/example-ledger-provider";

export default function PreviewDetail() {
  return (
    <ExampleReadScreen>
      <AccountPickerScreen />
    </ExampleReadScreen>
  );
}
