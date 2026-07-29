import { ClientOnly } from "@tanstack/react-router";
import { AgentPageImpl } from "./page";

export default function AgentPage() {
  return (
    <ClientOnly>
      <AgentPageImpl />
    </ClientOnly>
  );
}
