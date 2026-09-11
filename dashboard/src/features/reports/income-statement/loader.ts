import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import {
  GetLedgerIncomeStatementDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { resolvePresentationConversion } from "@/common/lib/ledger-search-params/conversion";
import { incomeStatementQueryDefaults } from "./constants";

export const incomeStatementLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
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
      query: GetLedgerIncomeStatementDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: incomeStatementQueryDefaults.interval,
        conversion,
      },
    }),
  ]);
};
