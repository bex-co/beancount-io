import { router } from "expo-router";
import { analytics } from "../analytics";
import { apolloClient } from "../apollo/client";
import { ledgerVar } from "../vars";
import { ListLedgersDocument } from "../../generated-graphql/graphql";
import { initializeSignedInAccount } from "./signed-in-account";
import type { OAuthSession } from "./session-record";

export async function finalizeOAuthSignIn(
  session: OAuthSession,
  flow: "sign_in" | "sign_up",
): Promise<void> {
  await initializeSignedInAccount(session, flow, {
    identify: (userId) => analytics.identify(userId),
    track: (event) => analytics.track(event, {}),
    listLedgerIds: async () => {
      const { data } = await apolloClient.query({
        query: ListLedgersDocument,
        fetchPolicy: "network-only",
      });
      return (data?.listLedgers ?? []).map(
        (ledger: { id: string }) => ledger.id,
      );
    },
    getSelectedLedger: ledgerVar,
    setSelectedLedger: ledgerVar,
    navigateToApp: () => router.replace("/(app)/(tabs)"),
    reportLedgerLoadFailure: (error) => {
      console.error("Failed to load ledgers after OAuth sign-in", error);
    },
  });
}
