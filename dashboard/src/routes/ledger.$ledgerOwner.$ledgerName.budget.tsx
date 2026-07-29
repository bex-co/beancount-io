import { createFileRoute } from "@tanstack/react-router";
import LedgerBudgetPage from "@/features/ledger-data/budget";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/budget")(
  {
    component: LedgerBudgetPage,
  },
);
