import { createFileRoute } from "@tanstack/react-router";
import GalleryPage from "@/features/ledger-list/pages/gallery-page";
import { requireAuth } from "@/common/lib/auth/auth";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger-gallery")({
  component: GalleryPage,
  beforeLoad: requireAuth("/ledger-gallery"),
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerGallery.title",
        "seo.ledgerGallery.description",
      ),
      { noIndex: true },
    ),
});
