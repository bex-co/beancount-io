import { router } from "expo-router";
import { apolloClient } from "../apollo/client";
import { ledgerVar, sessionVar } from "../vars";
import {
  GetLedgerDocument,
  ListLedgersDocument,
} from "../../generated-graphql/graphql";
import { initializeSignedInAccount } from "./signed-in-account";
import { takePendingAppLink } from "../app-links/pending-app-link";
import { openAppLinkTarget } from "../app-links/open-app-link";
import { clearGuestVisit, updateGuestVisit } from "../guest/guest-state";
import { restoreGuestView } from "../guest/restore-guest-view";
import { guestReadFailure } from "../guest/guest-client";
import { getServerUrl } from "../vars/server-url";

export async function finalizeOAuthSignIn(state: string): Promise<void> {
  const account = sessionVar();
  if (!account?.serverUrl) return;
  const serverUrl = account.serverUrl;
  const isCurrentSession = () =>
    sessionVar() === account && getServerUrl() === account.serverUrl;
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
    setSelectedLedger: (ledgerId) => {
      if (isCurrentSession()) ledgerVar(ledgerId);
    },
    navigateToApp: async () => {
      if (!isCurrentSession()) return;
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
          if (result.ok) {
            clearGuestVisit();
            return;
          }
        }
      }
      if (!isCurrentSession()) return;
      if (
        await restoreGuestView({
          serverUrl,
          state,
          isCurrentSession,
          readLedger: async (ledgerId) => {
            const { data } = await apolloClient.query({
              query: GetLedgerDocument,
              variables: { ledgerId },
              fetchPolicy: "network-only",
            });
            return data.getLedger;
          },
          restore: (visit) => {
            ledgerVar(visit.ledgerId);
            const routes = {
              home: "/(app)/(tabs)",
              accounts: "/(app)/(tabs)/accounts",
              reports: "/(app)/(tabs)/reports",
              transactions: "/(app)/(tabs)/transactions",
              files: "/(app)/(tabs)/ledger",
            } as const;
            router.replace(routes[visit.view]);
            clearGuestVisit();
          },
          unavailable: (error) => {
            updateGuestVisit({
              resumeFailure: guestReadFailure(
                error as Parameters<typeof guestReadFailure>[0],
              ),
            });
            router.replace("/examples");
          },
        })
      )
        return;
      if (!isCurrentSession()) return;
      clearGuestVisit();
      router.replace("/(app)/(tabs)");
    },
    reportLedgerLoadFailure: (error) => {
      console.error("Failed to load ledgers after OAuth sign-in", error);
    },
  });
}
