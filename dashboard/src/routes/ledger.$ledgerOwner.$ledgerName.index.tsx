import { createFileRoute } from "@tanstack/react-router";
import LedgerOverviewPage from "@/features/reports/overview";
import { ledgerFilterLoaderDeps } from "@/common/lib/ledger-search-params";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { overviewLoader } from "@/features/reports/overview/loader";
import { overviewSearchSchema } from "@/features/reports/overview/search";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/")({
  component: LedgerOverviewPage,
  validateSearch: (search) => overviewSearchSchema.parse(search),
  loaderDeps: ({ search }) => ledgerFilterLoaderDeps(search),
  loader: overviewLoader,
  head: (args) => createLedgerHead(args, "ledgerOverview"),
});
