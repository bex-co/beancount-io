import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/features/user-settings/pages/layout";
import { requireAuth } from "@/common/lib/auth/auth";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth("/settings"),
  component: SettingsLayout,
});
