import { createFileRoute } from "@tanstack/react-router";
import LedgerCommoditiesPage from "@/features/ledger-data/commodities";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/commodities",
)({
  component: LedgerCommoditiesPage,
  head: (args) => createLedgerHead(args, "ledgerCommodities"),
});
