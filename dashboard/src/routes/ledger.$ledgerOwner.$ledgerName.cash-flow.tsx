import { createFileRoute } from "@tanstack/react-router";
import LedgerCashFlowPage from "@/features/reports/cash-flow";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { cashFlowLoader } from "@/features/reports/cash-flow/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
)({
  component: LedgerCashFlowPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerCashFlow.title",
        "seo.ledgerCashFlow.description",
        { ledgerName: params.ledgerName },
      ),
    ),
  loader: cashFlowLoader,
});
