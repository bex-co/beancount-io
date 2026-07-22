import { MultiPostingsTransactionScreen } from "@/screens/multi-postings-transaction";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransaction() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("multiPostingsTitle") }} />
      <MultiPostingsTransactionScreen />
    </>
  );
}
