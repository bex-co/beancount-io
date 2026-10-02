import { createFileRoute } from "@tanstack/react-router";
import LedgerDirectoryPage from "@/features/ledger-editor/directory-browse";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
)({
  component: LedgerDirectoryPage,
  head: (args) => createLedgerHead(args, "ledgerFiles", { noIndex: true }),
});
