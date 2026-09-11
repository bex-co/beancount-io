import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import {
  GetLedgerBalanceSheetDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { resolvePresentationConversion } from "@/common/lib/ledger-search-params/conversion";
import { balanceSheetQueryDefaults } from "./constants";

export const balanceSheetLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const ledgerResult = await context.client.query({
    query: GetLedgerDocument,
    variables: { ledgerId },
  });
  const conversion = resolvePresentationConversion(
    deps.conversion,
    ledgerResult.data?.getLedger.options.operatingCurrency ?? [],
  );
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerBalanceSheetDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: balanceSheetQueryDefaults.interval,
        conversion,
      },
    }),
  ]);
};
