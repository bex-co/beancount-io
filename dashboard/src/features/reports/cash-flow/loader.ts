import type { RouteLoader } from "@/common/types/route-loader";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";
import { GetLedgerCashFlowDocument } from "@/graphql/definitions";
import { cashFlowQueryDefaults } from "./constants";

export const cashFlowLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/cash-flow"
> = async ({ params, context }) => {
  await context.client.query({
    query: GetLedgerCashFlowDocument,
    variables: {
      ledgerId: `${params.ledgerOwner}/${params.ledgerName}`,
      account: getLedgerSearchParams().account,
      filter: getLedgerSearchParams().filter,
      time: getLedgerSearchParams().time,
      interval: cashFlowQueryDefaults.interval,
      conversion: cashFlowQueryDefaults.conversion,
    },
  });
};
