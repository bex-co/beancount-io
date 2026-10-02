import { createFileRoute } from "@tanstack/react-router";
import LedgerStatisticsPage from "@/features/ledger-data/statistics";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/statistics",
)({
  component: LedgerStatisticsPage,
  head: (args) => createLedgerHead(args, "ledgerStatistics"),
});
