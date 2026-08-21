import { createFileRoute } from "@tanstack/react-router";
import { PlaidConnectionsPage } from "@/features/plaid/pages/plaid-connections";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/plaid-connections",
)({
  component: PlaidConnectionsPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.plaidConnections.title",
        "seo.plaidConnections.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
