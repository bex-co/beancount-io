import { createFileRoute } from "@tanstack/react-router";
import ApiKeysSettingsPage from "@/features/user-settings/pages/api-keys";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/settings/api-keys")({
  component: ApiKeysSettingsPage,
  head: createNoIndexHead,
});
