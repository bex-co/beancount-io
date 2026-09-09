import { rewriteSystemPath } from "@/common/app-links/rewrite-system-path";
import { HOSTED_APP_ORIGIN } from "@/common/app-links/resolve-app-link";

/**
 * Rewrite incoming Universal / App Link paths before Expo Router matches them.
 * Without this, `https://beancount.io/ledger/...` is treated as an in-app route
 * and lands on +not-found.
 *
 * Uses the hosted origin as the server hint here: +native-intent runs before
 * app providers, so reactive server-url overrides are not reliably available.
 * Self-hosted https hosts still resolve when the incoming URL's host matches
 * (resolveAppLink always accepts the URL's own host when passed as serverUrl).
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    // Prefer the URL's own origin when the system hands us an absolute link so
    // self-hosted hosts resolve; otherwise fall back to the hosted origin.
    let serverUrl = HOSTED_APP_ORIGIN;
    if (/^https?:\/\//i.test(path)) {
      try {
        serverUrl = new URL(path).origin;
      } catch {
        serverUrl = HOSTED_APP_ORIGIN;
      }
    }
    return rewriteSystemPath(path, serverUrl);
  } catch {
    return "/";
  }
}
