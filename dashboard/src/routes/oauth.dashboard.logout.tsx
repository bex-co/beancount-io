import { createFileRoute } from "@tanstack/react-router";
import { handleDashboardOAuthLogout } from "@/features/oauth/dashboard-oauth.server";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/dashboard/logout")({
  head: createNoIndexHead,
  server: { handlers: { GET: handleDashboardOAuthLogout } },
});
