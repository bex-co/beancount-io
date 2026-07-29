import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuth } from "@/common/lib/auth/auth";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { getUserDefaultLedger } from "@/common/lib/utils/ledger-utils";
import { useEffect } from "react";
import { useApolloClient } from "@apollo/client/react";

// Component that handles the redirect on the client side
function LedgerRedirectComponent() {
  const navigate = useNavigate();
  const client = useApolloClient();

  useEffect(() => {
    const performRedirect = async () => {
      // Get user's default ledger
      const defaultLedger = await getUserDefaultLedger(client);

      if (!defaultLedger) {
        // No ledgers found, redirect to ledger list page
        void navigate({ to: "/ledger" });
        return;
      }

      // Get first ledger and decode its ID
      const { ledgerOwner, ledgerName } = decodeLedgerId(defaultLedger.id);

      // Always redirect to overview page regardless of the requested sub-path
      void navigate({
        to: `/ledger/${ledgerOwner}/${ledgerName}`,
      });
    };

    void performRedirect();
  }, [navigate, client]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Redirecting...</h2>
        <p className="text-sm text-muted-foreground">Loading your ledger</p>
      </div>
    </div>
  );
}

// legacy route for /ledger/0/income_statement
export const Route = createFileRoute("/ledger/0/income_statement")({
  beforeLoad: requireAuth("/ledger/0/income_statement"),
  component: LedgerRedirectComponent,
});
