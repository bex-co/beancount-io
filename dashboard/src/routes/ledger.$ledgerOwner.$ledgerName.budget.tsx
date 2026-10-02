import { createFileRoute } from "@tanstack/react-router";
import LedgerBudgetPage from "@/features/ledger-data/budget";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/budget")(
  {
    component: LedgerBudgetPage,
    head: (args) => createLedgerHead(args, "ledgerBudget"),
  },
);
