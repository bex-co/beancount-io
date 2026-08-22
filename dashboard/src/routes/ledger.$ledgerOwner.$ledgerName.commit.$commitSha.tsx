import { createFileRoute } from "@tanstack/react-router";
import CommitDetailPage from "@/features/git/commits/pages/commit-detail-page";
import { createHeadMeta, getSEOMetadata } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
)({
  component: CommitDetailPage,
  head: ({ params }) => {
    const shortSha = params.commitSha.slice(0, 7);
    const metadata = getSEOMetadata(
      "seo.ledgerCommit.title",
      "seo.ledgerCommit.description",
      { ledgerName: params.ledgerName, shortSha },
    );
    return createHeadMeta(metadata);
  },
});
