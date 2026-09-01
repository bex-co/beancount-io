import { createFileRoute } from "@tanstack/react-router";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { handleDashboardMagicLinkStart } from "@/features/oauth/dashboard-oauth.server";

export const Route = createFileRoute("/auth/callback")({
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.authCallback.title", "seo.authCallback.description"),
      { noIndex: true },
    ),
  server: { handlers: { GET: handleDashboardMagicLinkStart } },
});
