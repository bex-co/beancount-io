import { createFileRoute } from "@tanstack/react-router";
import PRReviewPage from "@/features/git/pull-requests/pages/pr-review-page";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/pull/$prNumber",
)({
  component: PRReviewPage,
});
