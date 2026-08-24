import { flushSession, sessionVar } from "@/common/vars";
import { router } from "expo-router";
import { purgeApolloCache } from "@/common/apollo/cache-persist";
import { teardownSessionCaches } from "@/common/apollo/session-teardown";
import { oauthTokenManager } from "@/common/oauth/oauth-token-manager";
import { createAuthErrorLink } from "@/common/apollo/auth-error-link";

let teardownInFlight: Promise<void> | null = null;

function teardownAndRoute(): Promise<void> {
  if (!teardownInFlight) {
    teardownInFlight = oauthTokenManager
      .cancelPendingRefreshes()
      .then(() => import("@/common/apollo/client"))
      .then(({ apolloClient }) =>
        teardownSessionCaches({
          clearSession: () => sessionVar(null),
          flushSession,
          purgePersistedCache: purgeApolloCache,
          clearInMemoryStore: () => apolloClient.clearStore(),
        }),
      )
      .finally(() => {
        router.replace("/auth/welcome");
        teardownInFlight = null;
      });
  }
  return teardownInFlight;
}

export const onErrorLink = createAuthErrorLink({
  getSession: sessionVar,
  refresh: () => oauthTokenManager.getAccessToken(true),
  teardown: teardownAndRoute,
  onTerminalRefreshFailure: () => router.replace("/auth/welcome"),
});
