import { createFileRoute, notFound } from "@tanstack/react-router";
import NotFoundPage from "@/common/root-route/not-found-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/$")({
  // Matching this catch-all means no real route owns the URL — throw so SSR
  // answers 404 the same way the ledger loader does for missing ledgers.
  loader: () => {
    throw notFound();
  },
  component: NotFoundPage,
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.notFound.title",
        "seo.notFound.description",
      ),
      { noIndex: true },
    ),
});
