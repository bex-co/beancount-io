import { useCallback, useRef, useState } from "react";
import { startNativeAuthorization } from "@/common/oauth/start-authorization";
import {
  runNativeSignIn,
  type NativeSignInFailure,
  type NativeSignInFlow,
} from "@/screens/welcome/native-sign-in-runner";

export type NativeSignIn = {
  /** The flow whose browser is open, so only that button shows progress. */
  pendingFlow: NativeSignInFlow | null;
  /** The last failed attempt: which button, and why, so the message fits. */
  failure: { flow: NativeSignInFlow; reason: NativeSignInFailure } | null;
  start: (flow: NativeSignInFlow) => void;
};

/**
 * Drive the external-browser sign-in or sign-up from the welcome screen. A
 * successful exchange navigates into the app from the shared finalizer. The
 * launcher already refuses to open a second browser; the guard here only keeps
 * a second tap from moving the spinner to the wrong button.
 */
export function useNativeSignIn(): NativeSignIn {
  const [pendingFlow, setPendingFlow] = useState<NativeSignInFlow | null>(null);
  const [failure, setFailure] = useState<NativeSignIn["failure"]>(null);
  const running = useRef(false);

  const start = useCallback((flow: NativeSignInFlow) => {
    if (running.current) return;
    running.current = true;
    setPendingFlow(flow);
    setFailure(null);

    void runNativeSignIn(flow, startNativeAuthorization).then((outcome) => {
      running.current = false;
      setPendingFlow(null);
      if (outcome !== "completed" && outcome !== "cancelled") {
        setFailure({ flow, reason: outcome });
      }
    });
  }, []);

  return { pendingFlow, failure, start };
}
