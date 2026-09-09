import { createFileRoute } from "@tanstack/react-router";
import LedgerBalanceSheetPage from "@/features/reports/balance-sheet";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { balanceSheetLoader } from "@/features/reports/balance-sheet/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
)({
  component: LedgerBalanceSheetPage,
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  loader: balanceSheetLoader,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerBalanceSheet.title",
        "seo.ledgerBalanceSheet.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
