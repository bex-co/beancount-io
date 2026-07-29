import { createFileRoute } from "@tanstack/react-router";
import LedgerDocumentsPage from "@/features/ledger-data/documents";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/documents",
)({
  component: LedgerDocumentsPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerDocuments.title",
        "seo.ledgerDocuments.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
