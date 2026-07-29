import { createFileRoute } from "@tanstack/react-router";
import ImportPage from "@/features/importer/pages/import-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/import")(
  {
    component: ImportPage,
    head: ({ params }) =>
      createHeadMeta(
        getSEOMetadata(
          "seo.ledgerImport.title",
          "seo.ledgerImport.description",
          { ledgerName: params.ledgerName },
        ),
      ),
  },
);
