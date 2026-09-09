import { createFileRoute } from "@tanstack/react-router";
import LedgerIncomeStatementPage from "@/features/reports/income-statement";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { incomeStatementLoader } from "@/features/reports/income-statement/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
)({
  component: LedgerIncomeStatementPage,
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerIncomeStatement.title",
        "seo.ledgerIncomeStatement.description",
        { ledgerName: params.ledgerName },
      ),
    ),
  loader: incomeStatementLoader,
});
