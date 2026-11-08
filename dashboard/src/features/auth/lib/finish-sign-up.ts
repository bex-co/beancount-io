import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { hardNavigate } from "@/common/lib/navigation/hard-navigate";
import { postLegacyMobileAuthToken } from "@/common/providers/react-native-bridge-provider/legacy-auth-bridge";

/**
 * Leave sign-up once the account is signed in: hand the token to a wrapping
 * native app, then go where `?next=` asked or to the welcome page. Shared by
 * both ways a sign-up can finish (the emailed code, or none on a self-hosted
 * deployment) so they cannot drift apart.
 */
export function finishSignUp(
  accessToken: string,
  next: string | undefined,
  navigate: (options: { to: "/auth/welcome" }) => unknown,
): void {
  postLegacyMobileAuthToken(accessToken, "otp");
  const safeNext = getSafeRedirectPath(next);
  if (safeNext) {
    // `next` may target a cross-app page (the marketing site's /pricing),
    // which this router has no route for — a hard navigation is required.
    hardNavigate(safeNext);
    return;
  }
  void navigate({ to: "/auth/welcome" });
}
