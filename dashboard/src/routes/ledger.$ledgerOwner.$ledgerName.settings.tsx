import { createFileRoute } from "@tanstack/react-router";
import LedgerSettingsPage from "@/features/ledger-data/settings";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/settings",
)({
  component: LedgerSettingsPage,
  head: (args) => createLedgerHead(args, "ledgerSettings", { noIndex: true }),
});
