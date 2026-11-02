import { Stack } from "expo-router";
import { i18n } from "@/translations";
import { PlanScreen } from "@/screens/plan-screen/plan-screen";

export default function Plan() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("plan") }} />
      <PlanScreen />
    </>
  );
}
