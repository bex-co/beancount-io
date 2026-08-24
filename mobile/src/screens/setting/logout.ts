import { analytics } from "@/common/analytics";
import type { Session } from "@/common/vars/session";
import { apolloClient } from "@/common/apollo/client";
import { LogoutDocument } from "@/generated-graphql/graphql";
import { revokeOAuthSession } from "@/common/oauth/token-manager";
import { oauthTokenManager } from "@/common/oauth/oauth-token-manager";
import { clearServerScopedState } from "@/common/server-url-actions";
import { performLogout } from "./logout-action";

/**
 * Sign-out choke point: clear the session, wipe the persisted Apollo cache,
 * and reset the in-memory store so a later sign-in can never render another
 * account's ledger from disk.
 */
export async function actionLogout(session: Session) {
  await performLogout(session, {
    cancelRefreshes: () => oauthTokenManager.cancelPendingRefreshes(),
    revokeOAuth: revokeOAuthSession,
    revokeLegacy: async (authToken) => {
      await apolloClient.mutate({
        mutation: LogoutDocument,
        context: { headers: { authorization: `Bearer ${authToken}` } },
      });
    },
    clearLocalState: clearServerScopedState,
    trackLogout: () => analytics.track("logged_out", {}),
    deleteAnalyticsUser: () => analytics.peopleDeleteUser(),
  });
}
