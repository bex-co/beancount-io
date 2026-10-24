import { ReferralScreen } from "@/screens/referral-screen/referral-screen";
import { Redirect, Stack } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { i18n } from "@/translations";
import { isOfficialServerUrl } from "@/common/server-url-validation";
import { getServerUrl, serverUrlOverrideVar } from "@/common/vars/server-url";

export default function Referral() {
  useReactiveVar(serverUrlOverrideVar);
  // The invite link is the hosted service's sign-up page; a self-hosted server
  // has no such invitation (w21/916).
  if (!isOfficialServerUrl(getServerUrl())) {
    return <Redirect href="/(app)/(tabs)" />;
  }
  return (
    <>
      <Stack.Screen options={{ title: i18n.t("referral") }} />
      <ReferralScreen />
    </>
  );
}
