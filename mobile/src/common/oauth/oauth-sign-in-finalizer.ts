import { router } from "expo-router";
import { apolloClient } from "../apollo/client";
import { ledgerVar, sessionVar } from "../vars";
import { ListLedgersDocument } from "../../generated-graphql/graphql";
import { initializeSignedInAccount } from "./signed-in-account";
import { takePendingAppLink } from "../app-links/pending-app-link";
import { openAppLinkTarget } from "../app-links/open-app-link";

export async function finalizeOAuthSignIn(): Promise<void> {
  await initializeSignedInAccount({
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
    navigateToApp: async () => {
      const pending = takePendingAppLink();
      if (pending) {
        const account = sessionVar();
        if (account) {
          const result = await openAppLinkTarget({
            client: apolloClient,
            target: pending.target,
            sourceUrl: pending.sourceUrl,
            isCurrentSession: () => {
              const latest = sessionVar();
              return (
                !!latest &&
                latest.userId === account.userId &&
                latest.serverUrl === account.serverUrl
              );
            },
          });
          if (result.ok) return;
        }
      }
      router.replace("/(app)/(tabs)");
    },
    reportLedgerLoadFailure: (error) => {
      console.error("Failed to load ledgers after OAuth sign-in", error);
    },
  });
}
