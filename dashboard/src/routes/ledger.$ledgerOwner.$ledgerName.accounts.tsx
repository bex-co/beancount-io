import { createFileRoute } from "@tanstack/react-router";
import LedgerAccountsPage from "@/features/ledger-data/accounts";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/accounts",
)({
  component: LedgerAccountsPage,
  validateSearch: (search) => accountsActionSearchSchema.parse(search),
});
