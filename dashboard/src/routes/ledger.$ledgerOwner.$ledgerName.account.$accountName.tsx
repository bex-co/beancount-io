import { createFileRoute } from "@tanstack/react-router";
import LedgerAccountPage from "@/features/reports/account";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { accountJournalSearchSchema } from "@/features/reports/account/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
)({
  component: LedgerAccountPage,
  validateSearch: (search) => accountJournalSearchSchema.parse(search),
  head: (args) => createLedgerHead(args, "ledgerAccount"),
});
