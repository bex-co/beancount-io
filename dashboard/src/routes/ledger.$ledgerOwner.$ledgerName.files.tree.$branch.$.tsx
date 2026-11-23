import { createFileRoute } from "@tanstack/react-router";
import LedgerDirectoryPage from "@/features/ledger-editor/directory-browse";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { requireSupportedBranch } from "@/features/ledger-editor/shared/lib/supported-branch";
import { directoryLoader } from "@/features/ledger-editor/directory-browse/loader";
import { DirectoryNotFound } from "@/features/ledger-editor/directory-browse/not-found";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
)({
  component: LedgerDirectoryPage,
  beforeLoad: ({ params }) => requireSupportedBranch(params.branch),
  loader: directoryLoader,
  notFoundComponent: DirectoryNotFound,
  head: (args) =>
    args.match.status === "notFound" || args.match.status === "error"
      ? { meta: [], links: [] }
      : createLedgerHead(args, "ledgerFiles", { noIndex: true }),
});
