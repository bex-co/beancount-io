import { AccountsScreen } from "@/screens/accounts-screen";
import { LazyTabScreen } from "@/components/lazy-tab-screen";

export default function Accounts() {
  return (
    <LazyTabScreen>
      <AccountsScreen />
    </LazyTabScreen>
  );
}
