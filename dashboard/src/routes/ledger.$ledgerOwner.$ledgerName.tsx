import { createFileRoute } from "@tanstack/react-router";
import { LedgerLayout } from "@/common/components/ledger-layout";
import { LedgerRouteError } from "@/common/components/ledger-layout/ledger-route-error";
import { GetLedgerDocument } from "@/graphql/definitions";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName")({
  component: LedgerLayout,
  errorComponent: LedgerRouteError,
  loader: async ({ params, context }) => {
    const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
    // Only the ledger itself gates the route: its failure (not found,
    // private) surfaces as the route error. Sidebar counts belong to the
    // panels that show them — DirectiveUsageIndicator owns its directive
    // count and renders nothing until the real number exists — so they never
    // delay primary content and never flash a false zero.
    await context.client.query({
      query: GetLedgerDocument,
      variables: { ledgerId },
    });
  },
});
