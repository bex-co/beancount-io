import { createFileRoute } from "@tanstack/react-router";
import LedgerAccountPage from "@/features/reports/account";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
)({
  component: LedgerAccountPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerAccount.title",
        "seo.ledgerAccount.description",
        {
          ledgerName: params.ledgerName,
          accountName: params.accountName,
        },
      ),
    ),
});
