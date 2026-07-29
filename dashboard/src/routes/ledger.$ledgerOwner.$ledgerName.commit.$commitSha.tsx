import { createFileRoute } from "@tanstack/react-router";
import CommitDetailPage from "@/features/git/commits/pages/commit-detail-page";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
)({
  component: CommitDetailPage,
});
