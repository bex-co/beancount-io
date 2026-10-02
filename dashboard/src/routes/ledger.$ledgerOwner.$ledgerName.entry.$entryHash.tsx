import { createFileRoute } from "@tanstack/react-router";
import EntryPage from "@/features/journal/pages/entry-page";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
)({
  component: EntryPage,
  head: (args) => createLedgerHead(args, "ledgerEntry"),
});
