import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import { GetLedgerBalanceSheetDocument } from "@/graphql/definitions";
import { balanceSheetQueryDefaults } from "./constants";

export const balanceSheetLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet"
> = async ({ params, context }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerBalanceSheetDocument,
      variables: {
        ledgerId,
        account: getLedgerSearchParams().account,
        filter: getLedgerSearchParams().filter,
        time: getLedgerSearchParams().time,
        interval: balanceSheetQueryDefaults.interval,
        conversion: balanceSheetQueryDefaults.conversion,
      },
    }),
  ]);
};
