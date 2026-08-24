import type { OAuthSession } from "./session-record";

export type SignedInAccountDependencies = {
  identify: (userId: string) => void;
  track: (event: "logged_in" | "signed_up") => void;
  listLedgerIds: () => Promise<string[]>;
  getSelectedLedger: () => string | null;
  setSelectedLedger: (ledgerId: string | null) => void;
  navigateToApp: () => void;
  reportLedgerLoadFailure: (error: unknown) => void;
};

/** Complete account-local state after OAuth credentials are already durable. */
export async function initializeSignedInAccount(
  session: OAuthSession,
  flow: "sign_in" | "sign_up",
  dependencies: SignedInAccountDependencies,
): Promise<void> {
  dependencies.identify(session.userId);
  dependencies.track(flow === "sign_up" ? "signed_up" : "logged_in");

  try {
    const ledgerIds = await dependencies.listLedgerIds();
    const selected = dependencies.getSelectedLedger();
    if (ledgerIds.length > 0 && (!selected || !ledgerIds.includes(selected))) {
      dependencies.setSelectedLedger(ledgerIds[0]);
    } else if (ledgerIds.length === 0) {
      dependencies.setSelectedLedger(null);
    }
  } catch (error) {
    // Authentication succeeded. A ledger-list transport failure must not turn
    // it into a second token exchange or strand the user on the callback route.
    dependencies.reportLedgerLoadFailure(error);
  }

  dependencies.navigateToApp();
}
