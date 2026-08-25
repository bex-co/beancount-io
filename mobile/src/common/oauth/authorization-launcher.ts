import { buildAuthorizationUrl } from "./authorization-url";
import {
  createPendingAuthorization,
  type PendingOAuthAuthorization,
} from "./authorization-result";
import type { OAuthDiscovery } from "./discovery";
import type { PkceChallenge } from "./pkce";
import type { OAuthSession } from "./session-record";

/** The subset of an external-browser result this flow distinguishes. */
export type AuthorizationBrowserResult =
  { type: "success"; url: string } | { type: string; url?: string };

export type AuthorizationLauncherDependencies = {
  discover: (serverUrl: string) => Promise<OAuthDiscovery>;
  createPkce: () => Promise<PkceChallenge>;
  createState: () => string;
  redirectUri: () => string;
  savePending: (pending: PendingOAuthAuthorization) => Promise<void>;
  loadPending: () => Promise<PendingOAuthAuthorization | null>;
  clearPending: () => Promise<void>;
  /** Opens the OS browser and resolves once it returns to the app or closes. */
  openAuthSession: (
    authorizationUrl: string,
    redirectUri: string,
  ) => Promise<AuthorizationBrowserResult>;
  complete: (callbackUrl: string) => Promise<OAuthSession>;
  now?: () => number;
};

/**
 * Drop the stored verifier after a browser dismissal, but only when it still
 * belongs to the request being abandoned. A newer authorization may already
 * have replaced it — clearing that one would strand the flow the user is
 * actually in.
 */
async function discardPending(
  deps: AuthorizationLauncherDependencies,
  state: string,
): Promise<void> {
  try {
    const stored = await deps.loadPending();
    if (stored && stored.state !== state) return;
  } catch {
    // An unreadable record is not one worth preserving.
  }
  await deps.clearPending();
}

/**
 * Start authorization code + S256 PKCE in the external system browser.
 *
 * Resolves with the session when the browser handed the redirect back to this
 * JS context, and with `null` when it closed without one — either the user
 * cancelled, or the app was killed and Expo Router's callback route will finish
 * the exchange instead. Both paths funnel through the same single-flight
 * completer, so a one-time code is never exchanged twice.
 */
export function createAuthorizationLauncher(
  deps: AuthorizationLauncherDependencies,
): (
  serverUrl: string,
  flow: PendingOAuthAuthorization["flow"],
) => Promise<OAuthSession | null> {
  let inFlight: Promise<OAuthSession | null> | undefined;

  return (serverUrl, flow) => {
    // A second tap must not open a second browser: the first one's verifier is
    // already the stored pending request, and overwriting it would make the
    // first redirect unexchangeable.
    if (inFlight) return inFlight;

    const promise = (async () => {
      const discovery = await deps.discover(serverUrl);
      const { codeVerifier, codeChallenge } = await deps.createPkce();
      const pending = createPendingAuthorization(discovery, {
        flow,
        redirectUri: deps.redirectUri(),
        state: deps.createState(),
        codeVerifier,
        ...(deps.now ? { createdAt: deps.now() } : {}),
      });

      // Durable before the browser opens: a cold launch has nothing else left
      // to prove the returning redirect belongs to a request this app made.
      await deps.savePending(pending);

      const result = await deps.openAuthSession(
        buildAuthorizationUrl(pending, codeChallenge),
        pending.redirectUri,
      );

      if (result.type === "success" && result.url) {
        return deps.complete(result.url);
      }
      await discardPending(deps, pending.state);
      return null;
    })().finally(() => {
      inFlight = undefined;
    });

    inFlight = promise;
    return promise;
  };
}
