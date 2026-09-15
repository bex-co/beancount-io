import { createFileRoute } from "@tanstack/react-router";
import PRReviewPage from "@/features/git/pull-requests/pages/pr-review-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/pull/$prNumber",
)({
  component: PRReviewPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerPullRequest.title",
        "seo.ledgerPullRequest.description",
        {
          ledgerName: params.ledgerName,
          prNumber: params.prNumber,
        },
      ),
    ),
});
