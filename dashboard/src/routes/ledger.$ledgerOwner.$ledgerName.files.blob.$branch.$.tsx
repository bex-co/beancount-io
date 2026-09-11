import { createFileRoute } from "@tanstack/react-router";
import LedgerFilePage from "@/features/ledger-editor/file-editor";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { withLedgerFileTitlePrefix } from "@/common/lib/seo/ledger-file-title";

const blobSearchSchema = z.object({
  editMode: z.boolean().optional(),
  lineNumber: z.number().optional(),
});

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
)({
  component: LedgerFilePage,
  validateSearch: (search) => blobSearchSchema.parse(search),
  head: ({ params, match }) => {
    const filePath = params._splat || "";
    const metadata = getSEOMetadata(
      match.context.localization.i18n,
      "seo.ledgerFiles.title",
      "seo.ledgerFiles.description",
      {
        ledgerName: params.ledgerName,
      },
    );

    return createHeadMeta(
      match.context.localization.i18n,
      {
        ...metadata,
        title: withLedgerFileTitlePrefix(filePath, metadata.title),
      },
      { noIndex: Boolean(match.search.editMode) },
    );
  },
});
