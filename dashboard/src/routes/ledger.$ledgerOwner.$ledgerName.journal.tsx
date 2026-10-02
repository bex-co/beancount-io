import { createFileRoute } from "@tanstack/react-router";
import LedgerJournalPage from "@/features/journal/pages/journal-page";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/journal",
)({
  component: LedgerJournalPage,
  validateSearch: (search) => journalActionSearchSchema.parse(search),
  head: (args) => createLedgerHead(args, "ledgerJournal"),
});
