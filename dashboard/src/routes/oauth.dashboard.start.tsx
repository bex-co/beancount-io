import { createFileRoute } from "@tanstack/react-router";
import { handleDashboardOAuthStart } from "@/features/oauth/dashboard-oauth.server";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/dashboard/start")({
  head: createNoIndexHead,
  server: { handlers: { GET: handleDashboardOAuthStart } },
});
