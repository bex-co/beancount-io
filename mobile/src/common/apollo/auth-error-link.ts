import { fromPromise } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import type { Session } from "../oauth/session-record";
import { OAuthRefreshError } from "../oauth/token-manager";

export type AuthErrorLinkDependencies = {
  getSession: () => Session | null;
  refresh: () => Promise<string | undefined>;
  teardown: () => Promise<void>;
  onTerminalRefreshFailure: () => void;
};

/** Refresh/replay policy kept independent of navigation and cache wiring. */
export function createAuthErrorLink(dependencies: AuthErrorLinkDependencies) {
  return onError(({ graphQLErrors, operation, forward }) => {
    const unauthenticated = graphQLErrors?.some(
      (error) => error.extensions?.code === "UNAUTHENTICATED",
    );
    if (!unauthenticated) return undefined;

    const session = dependencies.getSession();
    // No session is a signed-out app: whatever was still in flight (a deferred
    // refresh after Log out) has nothing to end, and tearing down again set
    // "Your session ended" over the Welcome screen and cleared a pending
    // sign-in (w21/924).
    if (session === null) return undefined;
    if (session.kind !== "oauth" || operation.getContext().oauthRetry) {
      void dependencies.teardown();
      return undefined;
    }

    return fromPromise(
      dependencies.refresh().catch((error: unknown) => {
        if (error instanceof OAuthRefreshError && error.terminal) {
          dependencies.onTerminalRefreshFailure();
        }
        throw error;
      }),
    ).flatMap((token) => {
      operation.setContext(
        ({ headers = {} }: { headers?: Record<string, string> }) => ({
          oauthRetry: true,
          headers: {
            ...headers,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
        }),
      );
      return forward(operation).map((result) => {
        if (
          result.errors?.some(
            (error) => error.extensions?.code === "UNAUTHENTICATED",
          )
        ) {
          void dependencies.teardown();
        }
        return result;
      });
    });
  });
}
