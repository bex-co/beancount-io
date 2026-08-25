import { useCallback, useRef, useState } from "react";
import { analytics } from "@/common/analytics";
import { OAuthAuthorizationError } from "@/common/oauth/authorization-result";
import { startNativeAuthorization } from "@/common/oauth/start-authorization";
import type { PendingOAuthAuthorization } from "@/common/oauth/authorization-result";

export type NativeSignInFlow = PendingOAuthAuthorization["flow"];

export type NativeSignIn = {
  /** The flow whose browser is open, so only that button shows progress. */
  pendingFlow: NativeSignInFlow | null;
  failed: boolean;
  start: (flow: NativeSignInFlow) => void;
};

/**
 * Drive the external-browser sign-in from the welcome screen.
 *
 * A successful exchange navigates into the app from the shared finalizer, so
 * there is nothing to do on that path here. Cancelling is not an error — the
 * user closed the browser — and only a real failure (unreachable server,
 * incompatible OAuth contract, rejected exchange) surfaces a message.
 */
export function useNativeSignIn(): NativeSignIn {
  const [pendingFlow, setPendingFlow] = useState<NativeSignInFlow | null>(null);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);

  const start = useCallback((flow: NativeSignInFlow) => {
    if (running.current) return;
    running.current = true;
    setPendingFlow(flow);
    setFailed(false);
    void analytics.track("tap_login_or_signup", {
      isSignUp: flow === "sign_up",
    });

    void startNativeAuthorization(flow)
      .catch((error: unknown) => {
        if (error instanceof OAuthAuthorizationError && error.cancelled) {
          return;
        }
        setFailed(true);
      })
      .finally(() => {
        running.current = false;
        setPendingFlow(null);
      });
  }, []);

  return { pendingFlow, failed, start };
}
