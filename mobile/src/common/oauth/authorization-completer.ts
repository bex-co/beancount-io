import {
  OAuthAuthorizationError,
  validateAuthorizationRedirect,
  type PendingOAuthAuthorization,
} from "./authorization-result";
import type { OAuthSession } from "./session-record";

export type AuthorizationCompletionDependencies = {
  loadPending: () => Promise<PendingOAuthAuthorization | null>;
  clearPending: () => Promise<void>;
  exchange: (
    pending: PendingOAuthAuthorization,
    code: string,
  ) => Promise<OAuthSession>;
  persist: (session: OAuthSession) => Promise<void>;
  afterPersist: (
    session: OAuthSession,
    pending: PendingOAuthAuthorization,
  ) => Promise<void>;
};

/**
 * Build one completion authority so a warm AuthSession result and a cold Expo
 * Router callback cannot exchange the same one-time code independently.
 */
export function createAuthorizationCompleter(
  dependencies: AuthorizationCompletionDependencies,
): (callbackUrl: string) => Promise<OAuthSession> {
  let inFlight:
    { callbackUrl: string; promise: Promise<OAuthSession> } | undefined;

  return (callbackUrl) => {
    if (inFlight) {
      if (inFlight.callbackUrl === callbackUrl) return inFlight.promise;
      return Promise.reject(
        new OAuthAuthorizationError("authorization_already_completing"),
      );
    }

    const promise = (async () => {
      const pending = await dependencies.loadPending();
      if (!pending) {
        throw new OAuthAuthorizationError("missing_pending_request");
      }

      let code: string;
      try {
        code = validateAuthorizationRedirect(callbackUrl, pending);
      } catch (error) {
        // A server-returned OAuth error is trusted only after state and issuer
        // validation, so it may consume the pending request. A malformed or
        // attacker-supplied deep link must not cancel the real browser flow.
        if (
          error instanceof OAuthAuthorizationError &&
          error.code !== "invalid_response"
        ) {
          await dependencies.clearPending();
        }
        throw error;
      }

      // Authorization codes are one-time credentials. Consume the verifier
      // before exchange so a process restart cannot replay the same callback.
      await dependencies.clearPending();
      const session = await dependencies.exchange(pending, code);
      await dependencies.persist(session);
      await dependencies.afterPersist(session, pending);
      return session;
    })().finally(() => {
      inFlight = undefined;
    });

    inFlight = { callbackUrl, promise };
    return promise;
  };
}
