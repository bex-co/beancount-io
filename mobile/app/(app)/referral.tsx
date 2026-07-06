import { ReferralScreen } from "@/screens/referral-screen/referral-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function Referral() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("referral") }} />
      <ReferralScreen />
    </>
  );
}
