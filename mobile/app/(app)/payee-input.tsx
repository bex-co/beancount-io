import { PayeeInputScreen } from "@/screens/multi-postings-transaction/payee-input-screen";
import { i18n } from "@/translations";
import { Stack } from "expo-router";

export default function PayeeInput() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("payee") }} />
      <PayeeInputScreen />
    </>
  );
}
