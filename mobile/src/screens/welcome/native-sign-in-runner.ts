import { OAuthAuthorizationError } from "../../common/oauth/authorization-result";
import type { PendingOAuthAuthorization } from "../../common/oauth/authorization-result";

export type NativeSignInFlow = PendingOAuthAuthorization["flow"];

/** What one welcome-screen tap ended in. */
export type NativeSignInOutcome = "completed" | "cancelled" | "failed";

/**
 * Run one attempt and say how it ended. Cancelling is the user closing the
 * browser, so it is not reported as a failure.
 */
export async function runNativeSignIn(
  flow: NativeSignInFlow,
  authorize: (flow: NativeSignInFlow) => Promise<unknown>,
): Promise<NativeSignInOutcome> {
  try {
    await authorize(flow);
    return "completed";
  } catch (error: unknown) {
    return error instanceof OAuthAuthorizationError && error.cancelled
      ? "cancelled"
      : "failed";
  }
}
