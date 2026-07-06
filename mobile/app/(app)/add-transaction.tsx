import { AddTransactionScreen } from "@/screens/add-transaction-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransaction() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("addTransaction") }} />
      <AddTransactionScreen />
    </>
  );
}
