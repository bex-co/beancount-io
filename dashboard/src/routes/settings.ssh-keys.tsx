import { createFileRoute } from "@tanstack/react-router";
import SSHKeySettingsPage from "@/features/user-settings/pages/ssh-keys";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/settings/ssh-keys")({
  component: SSHKeySettingsPage,
  head: () =>
    createHeadMeta(
      getSEOMetadata(
        "seo.settingsSshKeys.title",
        "seo.settingsSshKeys.description",
      ),
      { noIndex: true },
    ),
});
