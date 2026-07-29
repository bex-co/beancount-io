import { createFileRoute } from "@tanstack/react-router";
import DangerZoneSettingsPage from "@/features/user-settings/pages/danger-zone";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/settings/danger-zone")({
  component: DangerZoneSettingsPage,
  head: () =>
    createHeadMeta(
      getSEOMetadata(
        "seo.settingsDangerZone.title",
        "seo.settingsDangerZone.description",
      ),
    ),
});
