import { MultiLegScreen } from "@/screens/add-transaction-screen/multi-leg-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransactionMulti() {
  return (
    <>
      <Stack.Screen
        options={{
          title: i18n.t("multiLegTitle"),
        }}
      />
      <MultiLegScreen />
    </>
  );
}
