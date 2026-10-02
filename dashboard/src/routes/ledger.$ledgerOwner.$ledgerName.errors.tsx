import { createFileRoute } from "@tanstack/react-router";
import LedgerErrorsPage from "@/features/ledger-data/errors";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/errors")(
  {
    component: LedgerErrorsPage,
    head: (args) => createLedgerHead(args, "ledgerErrors", { noIndex: true }),
  },
);
