import { createFileRoute } from "@tanstack/react-router";
import {
  handleDashboardOAuthConsent,
  handleDashboardOAuthCredential,
} from "@/features/oauth/dashboard-oauth.server";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/dashboard-consent")({
  head: createNoIndexHead,
  server: {
    handlers: {
      GET: handleDashboardOAuthConsent,
      POST: handleDashboardOAuthCredential,
    },
  },
});
