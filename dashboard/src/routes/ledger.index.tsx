import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/features/ledger-list/pages/dashboard-page";
import { requireAuth } from "@/common/lib/auth/auth";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/")({
  beforeLoad: requireAuth("/ledger"),
  component: DashboardPage,
  head: () =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerDashboard.title",
        "seo.ledgerDashboard.description",
      ),
      { noIndex: true },
    ),
});
