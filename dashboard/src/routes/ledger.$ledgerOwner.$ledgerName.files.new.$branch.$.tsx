import { createFileRoute } from "@tanstack/react-router";
import LedgerCreateFilesPage from "@/features/ledger-editor/create-file";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$",
)({
  component: LedgerCreateFilesPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerFilesCreate.title",
        "seo.ledgerFilesCreate.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
