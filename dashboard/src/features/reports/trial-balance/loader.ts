import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import { trialBalanceQueryDefaults } from "./constants";

export const trialBalanceLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/trial-balance",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerTrialBalanceDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        conversion: trialBalanceQueryDefaults.conversion,
      },
    }),
  ]);
};
