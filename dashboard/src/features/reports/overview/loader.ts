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
import { loadPublicReadme } from "./load-public-readme";
import type { InitialLedgerReadme } from "@/common/lib/ledger-readme";

export const overviewLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/",
  { readme?: InitialLedgerReadme },
  LedgerSearchParams
> = async ({ params, context, deps, abortController }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const { account, filter, time } = deps;

  // Client navigation keeps optional panels nonblocking. Initial public SSR
  // additionally settles README within a deadline so its authored explanation
  // can be read without JavaScript, using the same first-render snapshot.
  const readme = import.meta.env.SSR
    ? loadPublicReadme(context.client, ledgerId, abortController.signal)
    : Promise.resolve(undefined);
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
  return { readme: await readme };
};
