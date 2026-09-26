import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { prefetchOptionalQuery } from "@/common/apollo/prefetch";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import { overviewQueryDefaults } from "./constants";

export const overviewLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const { account, filter, time } = deps;

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

  // Both reads are primary content: the flows at cost, and the balances at
  // market value. Awaiting both means a server render already has the market
  // figures, so nothing is drawn at cost and then replaced. The page renders
  // its own error states from these same queries, so a failure here must not
  // become a route error.
  await Promise.all([
    context.client
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
      .catch(() => undefined),
    context.client
      .query({
        query: GetLedgerOverviewValuationDocument,
        variables: {
          ledgerId,
          account,
          filter,
          time,
          interval: overviewQueryDefaults.interval,
        },
      })
      .catch(() => undefined),
  ]);
};
