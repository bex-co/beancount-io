import { createFileRoute } from "@tanstack/react-router";
import CommitsListPage from "@/features/git/commits/pages/commits-list-page";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commits",
)({
  component: CommitsListPage,
  head: (args) => createLedgerHead(args, "ledgerCommits"),
});
