import { useCallback, useRef, useState } from "react";
import { startNativeAuthorization } from "@/common/oauth/start-authorization";
import {
  runNativeSignIn,
  type NativeSignInFlow,
} from "@/screens/welcome/native-sign-in-runner";

export type NativeSignIn = {
  /** The flow whose browser is open, so only that button shows progress. */
  pendingFlow: NativeSignInFlow | null;
  /** The flow whose last attempt failed, so the message matches the button. */
  failedFlow: NativeSignInFlow | null;
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
  const [failedFlow, setFailedFlow] = useState<NativeSignInFlow | null>(null);
  const running = useRef(false);

  const start = useCallback((flow: NativeSignInFlow) => {
    if (running.current) return;
    running.current = true;
    setPendingFlow(flow);
    setFailedFlow(null);

    void runNativeSignIn(flow, startNativeAuthorization).then((outcome) => {
      running.current = false;
      setPendingFlow(null);
      if (outcome === "failed") setFailedFlow(flow);
    });
  }, []);

  return { pendingFlow, failedFlow, start };
}
