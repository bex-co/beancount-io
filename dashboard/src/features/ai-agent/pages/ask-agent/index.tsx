import { useState } from "react";
import { ClientOnly, useSearch } from "@tanstack/react-router";
import { nanoidBase58 } from "@/common/lib/utils/nanoid-base58";
import { AgentPageImpl } from "../agent/page";

/**
 * Sandbox Ask-AI surface (ADR 0005 / m17). Reuses the harness UIMessage chat
 * surface (AgentPageImpl) but points it at the harness-backed
 * `/api-gateway/ask-agent` route, passing a stable conversationId (the sandbox
 * container key) and the ASK/AGENT mode. Rendered by `/ask?mode=sandbox`.
 */
export default function AskAgentPage() {
  const search = useSearch({ strict: false }) as { mode?: string };
  // "sandbox" (the URL mode) maps to the read-only "ask" agent mode; an explicit
  // "agent" enables the edit/PR flow.
  const agentMode = search.mode === "agent" ? "agent" : "ask";

  // Stable per-mount conversation id → sandbox container key. A fresh page mount
  // starts a new conversation (new container).
  const [conversationId] = useState(() => `conv_${nanoidBase58(16)}`);

  return (
    <ClientOnly>
      <AgentPageImpl
        chatApi="ask-agent"
        routeSuffix="ask"
        bodyExtra={{ conversationId, mode: agentMode }}
      />
    </ClientOnly>
  );
}
