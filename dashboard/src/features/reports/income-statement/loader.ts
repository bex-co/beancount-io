import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerIncomeStatementDocument } from "@/graphql/definitions";
import { incomeStatementQueryDefaults } from "./constants";

export const incomeStatementLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerIncomeStatementDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: incomeStatementQueryDefaults.interval,
        conversion: incomeStatementQueryDefaults.conversion,
      },
    }),
  ]);
};
