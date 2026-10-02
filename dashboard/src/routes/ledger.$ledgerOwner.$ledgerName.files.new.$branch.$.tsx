import { createFileRoute } from "@tanstack/react-router";
import LedgerCreateFilesPage from "@/features/ledger-editor/create-file";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
)({
  component: LedgerCreateFilesPage,
  head: (args) =>
    createLedgerHead(args, "ledgerFilesCreate", { noIndex: true }),
});
