import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { AddTransactionNextScreen } from "@/screens/add-transaction-screen/add-transaction-next-screen";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransactionNext() {
  // The keypad always passes the amount it confirmed. Opened by URL without one
  // there is nothing to confirm, so go to the live flow instead of crashing on
  // the missing amount.
  const { currentMoney } = useLocalSearchParams<{ currentMoney?: string }>();
  if (!currentMoney) {
    return <Redirect href="/add-transaction" />;
  }
  return (
    <LedgerWriteGuard>
      <>
        <Stack.Screen
          options={{
            title: i18n.t("addTransaction"),
          }}
        />
        <AddTransactionNextScreen />
      </>
    </LedgerWriteGuard>
  );
}
