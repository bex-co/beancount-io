import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { oidcErrorSearch } from "@/features/auth/lib/oidc-error";
import GeneralSettingsPage from "@/features/user-settings/pages/general";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/settings/general")({
  component: GeneralSettingsPage,
  validateSearch: (search) =>
    z.object({ oidcError: oidcErrorSearch() }).parse(search),
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.settingsGeneral.title",
        "seo.settingsGeneral.description",
      ),
      { noIndex: true },
    ),
});
