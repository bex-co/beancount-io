import { Redirect } from "expo-router";

import { useSignedInOnArrival } from "@/common/hooks/use-signed-in-on-arrival";
import { ServerSettingsScreen } from "@/screens/welcome/server-settings-screen";

export default function ServerSettings(): JSX.Element {
  // Only the signed-out Welcome screen opens this. Deep-linked with a live
  // session it has no previous route, so its header offers no way back.
  const signedIn = useSignedInOnArrival();
  if (signedIn) {
    return <Redirect href="/(app)/(tabs)" />;
  }
  return <ServerSettingsScreen />;
}
