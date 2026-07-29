import { createFileRoute } from "@tanstack/react-router";
import LedgerBalanceSheetPage from "@/features/reports/balance-sheet";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { balanceSheetLoader } from "@/features/reports/balance-sheet/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
)({
  component: LedgerBalanceSheetPage,
  loader: balanceSheetLoader,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerBalanceSheet.title",
        "seo.ledgerBalanceSheet.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
