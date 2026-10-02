import { createFileRoute } from "@tanstack/react-router";
import { PlaidConnectionsPage } from "@/features/plaid/pages/plaid-connections";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/plaid-connections",
)({
  component: PlaidConnectionsPage,
  head: (args) => createLedgerHead(args, "plaidConnections", { noIndex: true }),
});
