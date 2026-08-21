import { createFileRoute } from "@tanstack/react-router";
import LedgerDirectoryPage from "@/features/ledger-editor/directory-browse";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
)({
  component: LedgerDirectoryPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata("seo.ledgerFiles.title", "seo.ledgerFiles.description", {
        ledgerName: params.ledgerName,
      }),
      { noIndex: true },
    ),
});
