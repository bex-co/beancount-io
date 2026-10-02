import { createFileRoute } from "@tanstack/react-router";
import LedgerDocumentsPage from "@/features/ledger-data/documents";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/documents",
)({
  component: LedgerDocumentsPage,
  head: (args) => createLedgerHead(args, "ledgerDocuments"),
});
