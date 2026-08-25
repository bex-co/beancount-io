import * as WebBrowser from "expo-web-browser";
import { getServerUrl } from "../vars/server-url";
import { completeOAuthAuthorization } from "./authorization-completion";
import { createAuthorizationLauncher } from "./authorization-launcher";
import type { PendingOAuthAuthorization } from "./authorization-result";
import { discoverOAuthServer } from "./discovery";
import { currentOAuthRedirectUri } from "./native-redirect";
import { createAuthorizationState, createPkceChallenge } from "./pkce";
import {
  clearPendingAuthorization,
  loadPendingAuthorization,
  savePendingAuthorization,
} from "./pending-authorization-storage";
import type { OAuthSession } from "./session-record";

const launch = createAuthorizationLauncher({
  discover: (serverUrl) => discoverOAuthServer(serverUrl),
  createPkce: createPkceChallenge,
  createState: createAuthorizationState,
  redirectUri: currentOAuthRedirectUri,
  savePending: savePendingAuthorization,
  loadPending: loadPendingAuthorization,
  clearPending: clearPendingAuthorization,
  // The external system browser, not an embedded WebView: the app never sees
  // the credentials the user types, and an existing browser session can be
  // reused instead of asking for a password the app could have observed.
  openAuthSession: (authorizationUrl, redirectUri) =>
    WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri, {
      preferEphemeralSession: false,
    }),
  complete: completeOAuthAuthorization,
});

/**
 * Authenticate against whichever server is selected right now — read at call
 * time, so the account created is always the one the user just chose on the
 * server screen.
 */
export function startNativeAuthorization(
  flow: PendingOAuthAuthorization["flow"],
): Promise<OAuthSession | null> {
  return launch(getServerUrl(), flow);
}
