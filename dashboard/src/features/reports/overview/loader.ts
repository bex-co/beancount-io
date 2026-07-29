import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import {
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
} from "@/graphql/definitions";
import { overviewQueryDefaults } from "./constants";

export const overviewLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/"
> = async ({ params, context }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const { account, filter, time } = getLedgerSearchParams();
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerOverviewDocument,
      variables: {
        ledgerId,
        account,
        filter,
        time,
        interval: overviewQueryDefaults.interval,
        conversion: overviewQueryDefaults.conversion,
      },
    }),
    context.client.query({
      query: GetLedgerFileDocument,
      variables: { ledgerId, path: "README.md" },
    }),
  ]);
};
