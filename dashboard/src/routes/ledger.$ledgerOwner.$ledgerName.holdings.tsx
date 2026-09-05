import { createFileRoute } from "@tanstack/react-router";
import LedgerHoldingsPage from "@/features/ledger-data/holdings/index";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/holdings",
)({
  component: LedgerHoldingsPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerHoldings.title",
        "seo.ledgerHoldings.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
