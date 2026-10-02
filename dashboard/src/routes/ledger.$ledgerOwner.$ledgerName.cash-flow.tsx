import { createFileRoute } from "@tanstack/react-router";
import LedgerCashFlowPage from "@/features/reports/cash-flow";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { cashFlowLoader } from "@/features/reports/cash-flow/loader";
import { viewSearchSchema } from "@/features/reports/cash-flow/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
)({
  component: LedgerCashFlowPage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  head: (args) => createLedgerHead(args, "ledgerCashFlow"),
  loader: cashFlowLoader,
});
