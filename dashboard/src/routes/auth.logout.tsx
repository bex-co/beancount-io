import { createFileRoute } from "@tanstack/react-router";
import LogoutPage from "@/features/auth/pages/logout-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/auth/logout")({
  component: LogoutPage,
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.logout.title",
        "seo.logout.description",
      ),
      { noIndex: true },
    ),
});
