import { OAuthAuthorizationError } from "../../common/oauth/authorization-result";
import type { PendingOAuthAuthorization } from "../../common/oauth/authorization-result";
import { OAuthDiscoveryError } from "../../common/oauth/discovery";

export type NativeSignInFlow = PendingOAuthAuthorization["flow"];

/** Why a tap did not end in a session; each gets its own line on screen. */
export type NativeSignInFailure = "unreachable" | "incompatible" | "rejected";

/** What one welcome-screen tap ended in. */
export type NativeSignInOutcome =
  "completed" | "cancelled" | NativeSignInFailure;

/**
 * Run one attempt and say how it ended. Cancelling is the user closing the
 * browser, so it is not reported as a failure; a server that cannot be reached
 * or is not a Beancount.io server is named as such rather than blamed on the
 * sign-in.
 */
export async function runNativeSignIn(
  flow: NativeSignInFlow,
  authorize: (flow: NativeSignInFlow) => Promise<unknown>,
): Promise<NativeSignInOutcome> {
  try {
    await authorize(flow);
    return "completed";
  } catch (error: unknown) {
    if (error instanceof OAuthAuthorizationError && error.cancelled) {
      return "cancelled";
    }
    if (error instanceof OAuthDiscoveryError) return error.kind;
    return "rejected";
  }
}
