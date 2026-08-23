import { onError } from "@apollo/client/link/error";
import { flushSession, sessionVar } from "@/common/vars";
import { router } from "expo-router";
import { purgeApolloCache } from "@/common/apollo/cache-persist";
import { teardownSessionCaches } from "@/common/apollo/session-teardown";

export const onErrorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions && err.extensions.code === "UNAUTHENTICATED") {
        // Same isolation as sign-out: drop the persisted cache so the next
        // account cannot inherit this one's numbers from AsyncStorage.
        // Lazy client import avoids a client ↔ error-handling cycle.
        void import("@/common/apollo/client").then(({ apolloClient }) =>
          teardownSessionCaches({
            clearSession: () => sessionVar(null),
            flushSession,
            purgePersistedCache: purgeApolloCache,
            clearInMemoryStore: () => apolloClient.clearStore(),
          }),
        );
        router.replace("/auth/welcome");
      }
    }
  }
  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
  }
});
