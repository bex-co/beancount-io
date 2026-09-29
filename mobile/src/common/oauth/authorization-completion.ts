import { persistSession } from "../vars/session";
import { createAuthorizationCompleter } from "./authorization-completer";
import { finalizeOAuthSignIn } from "./oauth-sign-in-finalizer";
import { createOAuthSessionFromCode } from "./code-exchange";
import { authorizationGeneration } from "./authorization-context";
import { getServerUrl } from "../vars/server-url";
import {
  clearPendingAuthorization,
  loadPendingAuthorization,
} from "./pending-authorization-storage";

export const completeOAuthAuthorization = createAuthorizationCompleter({
  contextVersion: authorizationGeneration,
  canComplete: (pending) => pending.serverUrl === getServerUrl(),
  loadPending: loadPendingAuthorization,
  clearPending: clearPendingAuthorization,
  exchange: createOAuthSessionFromCode,
  persist: persistSession,
  afterPersist: (_session, pending) => finalizeOAuthSignIn(pending.state),
});
