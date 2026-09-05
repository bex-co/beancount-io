import { createFileRoute } from "@tanstack/react-router";
import LedgerJournalPage from "@/features/journal/pages/journal-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { journalActionSearchSchema } from "@/common/lib/ledger-action-search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/journal",
)({
  component: LedgerJournalPage,
  validateSearch: (search) => journalActionSearchSchema.parse(search),
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerJournal.title",
        "seo.ledgerJournal.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
