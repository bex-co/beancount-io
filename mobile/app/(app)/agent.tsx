import { Redirect } from "expo-router";

import { config } from "@/config";
import { AgentScreen } from "@/screens/agent-screen";

export default function AgentRoute() {
  // Gating the Home card alone would leave `beancount:///(app)/agent` open to
  // anything that can fire a URL scheme, so the route is the real switch and
  // the card is only the visible half of it.
  if (!config.features.agentChat) {
    return <Redirect href="/(app)/(tabs)" />;
  }
  return <AgentScreen />;
}
