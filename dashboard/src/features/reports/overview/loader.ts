import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import { prefetchOptionalQuery } from "@/common/apollo/prefetch";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
} from "@/graphql/definitions";
import { overviewQueryDefaults } from "./constants";

export const overviewLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/"
> = async ({ params, context }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const { account, filter, time } = getLedgerSearchParams();

  // The README card and the account open-directive metadata (cash-flow-role
  // declarations behind the Sankey) are optional panels that own their
  // queries and show honest pending states. Start them alongside the overview
  // so they usually land together, but never let them gate primary content.
  prefetchOptionalQuery(context.client, {
    query: GetLedgerFileDocument,
    variables: { ledgerId, path: "README.md" },
  });
  prefetchOptionalQuery(context.client, {
    query: GetLedgerAccountMetaDocument,
    variables: { ledgerId },
  });

  // The page renders its own error state from this same query, so a failure
  // here must not become a route error.
  await context.client
    .query({
      query: GetLedgerOverviewDocument,
      variables: {
        ledgerId,
        account,
        filter,
        time,
        interval: overviewQueryDefaults.interval,
        conversion: overviewQueryDefaults.conversion,
      },
    })
    .catch(() => undefined);
};
