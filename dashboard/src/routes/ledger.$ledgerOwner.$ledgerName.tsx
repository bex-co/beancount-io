import { createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { LedgerLayout } from "@/common/components/ledger-layout";
import { LedgerRouteError } from "@/common/components/ledger-layout/ledger-route-error";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { GetLedgerDocument } from "@/graphql/definitions";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName")({
  component: LedgerLayout,
  errorComponent: LedgerRouteError,
  validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
  search: {
    // Keep account/filter/time across same-ledger report navigation (Related
    // Pages, sidebar). Explicit clears set the keys to undefined so retention
    // does not restore them. Ledger switches clear these in the switcher.
    middlewares: [retainSearchParams(["account", "filter", "time"])],
  },
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
