import { createFileRoute } from "@tanstack/react-router";
import CommitsListPage from "@/features/git/commits/pages/commits-list-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commits",
)({
  component: CommitsListPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerCommits.title",
        "seo.ledgerCommits.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
