import { AccountsScreen } from "@/screens/accounts-screen";
import { ExampleTabScreen } from "@/screens/examples/example-tabs";

export default function Accounts() {
  return (
    <ExampleTabScreen view="accounts">
      <AccountsScreen />
    </ExampleTabScreen>
  );
}
