import { createFileRoute } from "@tanstack/react-router";
import LedgerIncomeStatementPage from "@/features/reports/income-statement";
import { reportIntervalLoaderDeps } from "@/common/lib/navigation/report-interval";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { incomeStatementLoader } from "@/features/reports/income-statement/loader";
import { incomeStatementSearchSchema } from "@/features/reports/income-statement/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
)({
  component: LedgerIncomeStatementPage,
  validateSearch: (search) => incomeStatementSearchSchema.parse(search),
  loaderDeps: ({ search }) => reportIntervalLoaderDeps(search),
  head: (args) => createLedgerHead(args, "ledgerIncomeStatement"),
  loader: incomeStatementLoader,
});
