import { createFileRoute } from "@tanstack/react-router";
import LedgerCashFlowPage from "@/features/reports/cash-flow";
import { reportIntervalLoaderDeps } from "@/common/lib/navigation/report-interval";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { cashFlowLoader } from "@/features/reports/cash-flow/loader";
import { viewSearchSchema } from "@/features/reports/cash-flow/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
)({
  component: LedgerCashFlowPage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => reportIntervalLoaderDeps(search),
  head: (args) => createLedgerHead(args, "ledgerCashFlow"),
  loader: cashFlowLoader,
});
