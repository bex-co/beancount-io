import { createFileRoute } from "@tanstack/react-router";
import LedgerTrialBalancePage from "@/features/reports/trial-balance";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { trialBalanceLoader } from "@/features/reports/trial-balance/loader";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/trial-balance",
)({
  component: LedgerTrialBalancePage,
  loader: trialBalanceLoader,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerTrialBalance.title",
        "seo.ledgerTrialBalance.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
