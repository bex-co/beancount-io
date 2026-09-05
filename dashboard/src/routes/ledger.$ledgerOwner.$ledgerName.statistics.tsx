import { createFileRoute } from "@tanstack/react-router";
import LedgerStatisticsPage from "@/features/ledger-data/statistics";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/statistics",
)({
  component: LedgerStatisticsPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerStatistics.title",
        "seo.ledgerStatistics.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
