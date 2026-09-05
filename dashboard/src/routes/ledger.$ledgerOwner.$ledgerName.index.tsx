import { createFileRoute } from "@tanstack/react-router";
import LedgerOverviewPage from "@/features/reports/overview";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { overviewLoader } from "@/features/reports/overview/loader";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/")({
  component: LedgerOverviewPage,
  loader: overviewLoader,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerOverview.title",
        "seo.ledgerOverview.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
