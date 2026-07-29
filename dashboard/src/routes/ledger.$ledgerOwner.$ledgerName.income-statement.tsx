import { createFileRoute } from "@tanstack/react-router";
import LedgerIncomeStatementPage from "@/features/reports/income-statement";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { incomeStatementLoader } from "@/features/reports/income-statement/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
)({
  component: LedgerIncomeStatementPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerIncomeStatement.title",
        "seo.ledgerIncomeStatement.description",
        { ledgerName: params.ledgerName },
      ),
    ),
  loader: incomeStatementLoader,
});
