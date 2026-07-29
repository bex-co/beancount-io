import { useCallback, useState } from "react";
import { useSessionStorageState } from "@/common/hooks/use-session-storage-state";
import { nanoidBase58 } from "@/common/lib/utils/nanoid-base58";

function generateSessionId() {
  return `aisess_${nanoidBase58(16)}`;
}

export function useAgentSession(storageKey: string) {
  const [defaultId] = useState(generateSessionId);
  const [sessionId, setSessionId] = useSessionStorageState(
    storageKey,
    defaultId,
  );

  const startNewSession = useCallback(() => {
    setSessionId(generateSessionId());
  }, [setSessionId]);

  return { sessionId, startNewSession };
}
