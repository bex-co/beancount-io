import {
  holdPendingAppLinkForSignIn,
  releaseHeldAppLink,
} from "../app-links/pending-app-link";
import { persistSession } from "../vars/session";
import { clearAccountChoiceNeeded } from "./account-choice";
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
  // A completed sign-in is the account choice the sign-out asked for.
  persist: async (session, isCurrent) => {
    // Setting the session wakes the link handler's session effect; the link
    // waiting for sign-in is the finisher's to open, not that effect's.
    holdPendingAppLinkForSignIn();
    try {
      await persistSession(session, isCurrent);
      if (isCurrent()) await clearAccountChoiceNeeded().catch(() => undefined);
    } catch (error) {
      releaseHeldAppLink();
      throw error;
    }
  },
  afterPersist: async (_session, pending) => {
    try {
      await finalizeOAuthSignIn(pending.state);
    } finally {
      releaseHeldAppLink();
    }
  },
});
