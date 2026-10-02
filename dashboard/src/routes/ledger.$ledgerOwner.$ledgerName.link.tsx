import { createFileRoute } from "@tanstack/react-router";
import { PlaidSettingsPage } from "@/features/plaid/pages/plaid-settings";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/link")({
  component: PlaidSettingsPage,
  head: (args) => createLedgerHead(args, "plaidSettings", { noIndex: true }),
});
