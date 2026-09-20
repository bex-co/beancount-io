import { createFileRoute } from "@tanstack/react-router";
import LedgerCashFlowPage from "@/features/reports/cash-flow";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { cashFlowLoader } from "@/features/reports/cash-flow/loader";
import { viewSearchSchema } from "@/features/reports/cash-flow/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
)({
  component: LedgerCashFlowPage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerCashFlow.title",
        "seo.ledgerCashFlow.description",
        { ledgerName: params.ledgerName },
      ),
    ),
  loader: cashFlowLoader,
});
