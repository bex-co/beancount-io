import { createFileRoute } from "@tanstack/react-router";
import LedgerTrialBalancePage from "@/features/reports/trial-balance";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { trialBalanceLoader } from "@/features/reports/trial-balance/loader";
import { viewSearchSchema } from "@/features/reports/trial-balance/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/trial-balance",
)({
  component: LedgerTrialBalancePage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  loader: trialBalanceLoader,
  head: (args) => createLedgerHead(args, "ledgerTrialBalance"),
});
