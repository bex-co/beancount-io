import { createFileRoute } from "@tanstack/react-router";
import LedgerEventsPage from "@/features/ledger-data/events";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/events")(
  {
    component: LedgerEventsPage,
    head: (args) => createLedgerHead(args, "ledgerEvents"),
  },
);
