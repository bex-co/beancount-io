import { createFileRoute } from "@tanstack/react-router";
import LedgerCreateFilesPage from "@/features/ledger-editor/create-file";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
)({
  component: LedgerCreateFilesPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerFilesCreate.title",
        "seo.ledgerFilesCreate.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
