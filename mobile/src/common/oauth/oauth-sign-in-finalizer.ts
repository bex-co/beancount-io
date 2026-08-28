import { router } from "expo-router";
import { apolloClient } from "../apollo/client";
import { ledgerVar } from "../vars";
import { ListLedgersDocument } from "../../generated-graphql/graphql";
import { initializeSignedInAccount } from "./signed-in-account";

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
    navigateToApp: () => router.replace("/(app)/(tabs)"),
    reportLedgerLoadFailure: (error) => {
      console.error("Failed to load ledgers after OAuth sign-in", error);
    },
  });
}
