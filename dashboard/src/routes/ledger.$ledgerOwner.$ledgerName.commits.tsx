import { createFileRoute } from "@tanstack/react-router";
import CommitsListPage from "@/features/git/commits/pages/commits-list-page";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commits",
)({
  component: CommitsListPage,
});
