import { createFileRoute } from "@tanstack/react-router";
import EntryPage from "@/features/journal/pages/entry-page";
import { createHeadMeta, getSEOMetadata } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
)({
  component: EntryPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerEntry.title",
        "seo.ledgerEntry.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
