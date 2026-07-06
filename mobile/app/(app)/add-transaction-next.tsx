import { AddTransactionNextScreen } from "@/screens/add-transaction-screen/add-transaction-next-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransactionNext() {
  return (
    <>
      <Stack.Screen
        options={{
          title: i18n.t("addTransaction"),
        }}
      />
      <AddTransactionNextScreen />
    </>
  );
}
