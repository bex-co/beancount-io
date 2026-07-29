import { createFileRoute } from "@tanstack/react-router";
import { LedgerLayout } from "@/common/components/ledger-layout";
import { LedgerRouteError } from "@/common/components/ledger-layout/ledger-route-error";
import {
  GetLedgerDocument,
  GetLedgerEntriesCountPerTypeDocument,
} from "@/graphql/definitions";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName")({
  component: LedgerLayout,
  errorComponent: LedgerRouteError,
  loader: async ({ params, context }) => {
    const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
    // Run in parallel; only GetLedger's failure should surface as a route
    // error (e.g. ledger not found/private) — the directive count powers a
    // sidebar-only indicator (DirectiveUsageIndicator) that already
    // degrades gracefully to rendering nothing, so its prefetch is
    // deliberately fail-soft here too, matching overviewLoader's pattern.
    // Prefetching it here (rather than leaving it to the component's own
    // client-side useQuery) is what lets the indicator render with its real
    // count immediately instead of the count-query's loading gap flashing
    // a stale "0 / max" before the real number arrives.
    const [ledgerResult] = await Promise.allSettled([
      context.client.query({
        query: GetLedgerDocument,
        variables: { ledgerId },
      }),
      context.client.query({
        query: GetLedgerEntriesCountPerTypeDocument,
        variables: { ledgerId },
      }),
    ]);
    if (ledgerResult.status === "rejected") {
      throw ledgerResult.reason;
    }
  },
});
