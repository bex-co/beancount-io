import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import LedgerUploadFilesPage from "@/features/ledger-editor/upload-files";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

// Empty search schema - this route uses path params only
const searchSchema = z.object({});

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
)({
  component: LedgerUploadFilesPage,
  validateSearch: (search) => searchSchema.parse(search),
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerFilesUpload.title",
        "seo.ledgerFilesUpload.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
