import { track } from "@/common/analytics";
import { isReactNative } from "./react-native-bridge";

/**
 * Compatibility-only token handoff for released mobile versions. New mobile
 * versions never load these pages in a WebView. Keep the historical payload
 * shape until the documented support cutoff, but never broadcast it into an
 * ordinary browser window.
 */
export function postLegacyMobileAuthToken(
  authToken: string,
  flow: "password" | "otp" | "one_time_token",
): void {
  if (!isReactNative()) return;
  track("legacy_mobile_auth_completed", { flow });
  window.ReactNativeWebView?.postMessage(JSON.stringify({ authToken }));
}
