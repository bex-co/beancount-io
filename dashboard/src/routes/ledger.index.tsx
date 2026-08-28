import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/features/ledger-list/pages/dashboard-page";
import { requireAuth } from "@/common/lib/auth/auth";

// SEO meta for this route is owned by DashboardPage's <PageSEO> (seo.dashboard.*),
// which emits the full OG/Twitter set with request-scoped i18n.
export const Route = createFileRoute("/ledger/")({
  beforeLoad: requireAuth("/ledger"),
  component: DashboardPage,
});
