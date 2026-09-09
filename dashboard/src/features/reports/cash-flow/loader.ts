import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerCashFlowDocument } from "@/graphql/definitions";
import { cashFlowQueryDefaults } from "./constants";

export const cashFlowLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  await context.client.query({
    query: GetLedgerCashFlowDocument,
    variables: {
      ledgerId: `${params.ledgerOwner}/${params.ledgerName}`,
      account: deps.account,
      filter: deps.filter,
      time: deps.time,
      interval: cashFlowQueryDefaults.interval,
      conversion: cashFlowQueryDefaults.conversion,
    },
  });
};
