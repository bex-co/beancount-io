import { Redirect } from "expo-router";

import { useSignedInOnArrival } from "@/common/hooks/use-signed-in-on-arrival";
import { WelcomeScreen } from "@/screens/welcome";

export default function Auth() {
  // A signed-in user never belongs on the sign-in screen. The route is the real
  // switch, as for `(app)/agent`: anything that can fire the URL scheme reaches
  // it, and the auth stack shows no header, so there would be no way back.
  const signedIn = useSignedInOnArrival();
  if (signedIn) {
    return <Redirect href="/(app)/(tabs)" />;
  }
  return <WelcomeScreen />;
}
