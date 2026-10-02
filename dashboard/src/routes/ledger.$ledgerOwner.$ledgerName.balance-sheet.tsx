import { createFileRoute } from "@tanstack/react-router";
import LedgerBalanceSheetPage from "@/features/reports/balance-sheet";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { balanceSheetLoader } from "@/features/reports/balance-sheet/loader";
import { viewSearchSchema } from "@/features/reports/balance-sheet/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
)({
  component: LedgerBalanceSheetPage,
  validateSearch: (search) => viewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  loader: balanceSheetLoader,
  head: (args) => createLedgerHead(args, "ledgerBalanceSheet"),
});
