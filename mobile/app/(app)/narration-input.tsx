import { NarrationInputScreen } from "@/screens/multi-postings-transaction/narration-input-screen";
import { i18n } from "@/translations";
import { Stack } from "expo-router";

export default function Invite() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("narration") }} />
      <NarrationInputScreen />
    </>
  );
}
