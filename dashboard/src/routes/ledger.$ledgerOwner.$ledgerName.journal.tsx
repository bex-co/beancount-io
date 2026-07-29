import { createFileRoute } from "@tanstack/react-router";
import LedgerJournalPage from "@/features/journal/pages/journal-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/journal",
)({
  component: LedgerJournalPage,
  validateSearch: (search) => journalActionSearchSchema.parse(search),
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerJournal.title",
        "seo.ledgerJournal.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
