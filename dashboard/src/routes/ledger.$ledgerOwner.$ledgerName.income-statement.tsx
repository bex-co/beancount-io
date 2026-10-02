import { createFileRoute } from "@tanstack/react-router";
import LedgerIncomeStatementPage from "@/features/reports/income-statement";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { incomeStatementLoader } from "@/features/reports/income-statement/loader";
import { viewSearchSchema } from "@/features/reports/income-statement/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
)({
  component: LedgerIncomeStatementPage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  head: (args) => createLedgerHead(args, "ledgerIncomeStatement"),
  loader: incomeStatementLoader,
});
