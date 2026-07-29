import { createFileRoute } from "@tanstack/react-router";
import LedgerCommoditiesPage from "@/features/ledger-data/commodities";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commodities",
)({
  component: LedgerCommoditiesPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerCommodities.title",
        "seo.ledgerCommodities.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
