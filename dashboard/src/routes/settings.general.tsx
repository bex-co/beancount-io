import { createFileRoute } from "@tanstack/react-router";
import GeneralSettingsPage from "@/features/user-settings/pages/general";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/settings/general")({
  component: GeneralSettingsPage,
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
