import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import { trialBalanceQueryDefaults } from "./constants";

export const trialBalanceLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/trial-balance"
> = async ({ params, context }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerTrialBalanceDocument,
      variables: {
        ledgerId,
        account: getLedgerSearchParams().account,
        filter: getLedgerSearchParams().filter,
        time: getLedgerSearchParams().time,
        conversion: trialBalanceQueryDefaults.conversion,
      },
    }),
  ]);
};
