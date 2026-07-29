import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import { GetLedgerIncomeStatementDocument } from "@/graphql/definitions";
import { incomeStatementQueryDefaults } from "./constants";

export const incomeStatementLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/income-statement"
> = async ({ params, context }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerIncomeStatementDocument,
      variables: {
        ledgerId,
        account: getLedgerSearchParams().account,
        filter: getLedgerSearchParams().filter,
        time: getLedgerSearchParams().time,
        interval: incomeStatementQueryDefaults.interval,
        conversion: incomeStatementQueryDefaults.conversion,
      },
    }),
  ]);
};
