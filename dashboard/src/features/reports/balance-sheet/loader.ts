import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerBalanceSheetDocument } from "@/graphql/definitions";
import { balanceSheetQueryDefaults } from "./constants";

export const balanceSheetLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerBalanceSheetDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: balanceSheetQueryDefaults.interval,
        conversion: balanceSheetQueryDefaults.conversion,
      },
    }),
  ]);
};
