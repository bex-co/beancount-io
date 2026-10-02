import { createFileRoute } from "@tanstack/react-router";
import LedgerHoldingsPage from "@/features/ledger-data/holdings/index";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";
import { holdingsSearchSchema } from "@/features/ledger-data/holdings/search";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/holdings",
)({
  component: LedgerHoldingsPage,
  validateSearch: (search) => holdingsSearchSchema.parse(search),
  head: (args) => createLedgerHead(args, "ledgerHoldings"),
});
