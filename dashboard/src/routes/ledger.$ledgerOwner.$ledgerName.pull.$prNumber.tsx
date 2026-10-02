import { createFileRoute } from "@tanstack/react-router";
import PRReviewPage from "@/features/git/pull-requests/pages/pr-review-page";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/pull/$prNumber",
)({
  component: PRReviewPage,
  head: (args) => createLedgerHead(args, "ledgerPullRequest"),
});
