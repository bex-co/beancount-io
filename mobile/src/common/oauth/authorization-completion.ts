import { persistSession } from "../vars/session";
import { createAuthorizationCompleter } from "./authorization-completer";
import { finalizeOAuthSignIn } from "./oauth-sign-in-finalizer";
import { createOAuthSessionFromCode } from "./code-exchange";
import {
  clearPendingAuthorization,
  loadPendingAuthorization,
} from "./pending-authorization-storage";

export {
  createAuthorizationCompleter,
  type AuthorizationCompletionDependencies,
} from "./authorization-completer";

export const completeOAuthAuthorization = createAuthorizationCompleter({
  loadPending: loadPendingAuthorization,
  clearPending: clearPendingAuthorization,
  exchange: createOAuthSessionFromCode,
  persist: persistSession,
  afterPersist: (session, pending) =>
    finalizeOAuthSignIn(session, pending.flow),
});
