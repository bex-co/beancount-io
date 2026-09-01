import { createFileRoute } from "@tanstack/react-router";
import { handleDashboardOAuthCallback } from "@/features/oauth/dashboard-oauth.server";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/dashboard/callback")({
  head: createNoIndexHead,
  server: { handlers: { GET: handleDashboardOAuthCallback } },
});
