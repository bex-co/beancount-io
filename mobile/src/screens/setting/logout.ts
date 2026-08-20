import { analytics } from "@/common/analytics";
import { sessionVar } from "@/common/vars";
import { apolloClient } from "@/common/apollo/client";
import { purgeApolloCache } from "@/common/apollo/cache-persist";
import { teardownSessionCaches } from "@/common/apollo/session-teardown";
import { LogoutDocument } from "@/generated-graphql/graphql";

/**
 * Sign-out choke point: clear the session, wipe the persisted Apollo cache,
 * and reset the in-memory store so a later sign-in can never render another
 * account's ledger from disk.
 */
export async function actionLogout(authToken: string) {
  try {
    await apolloClient.mutate({
      mutation: LogoutDocument,
      context: { headers: { authorization: `Bearer ${authToken}` } },
    });
    analytics.track("logged_out", {});
    analytics.peopleDeleteUser();
  } catch (err) {
    console.log(`failed to request logout: ${err}`);
  } finally {
    await teardownSessionCaches({
      clearSession: () => sessionVar(null),
      purgePersistedCache: purgeApolloCache,
      clearInMemoryStore: () => apolloClient.clearStore(),
    });
  }
}
