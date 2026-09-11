import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import {
  GetLedgerCashFlowDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { resolvePresentationConversion } from "@/common/lib/ledger-search-params/conversion";
import { cashFlowQueryDefaults } from "./constants";

export const cashFlowLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
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
  await context.client.query({
    query: GetLedgerCashFlowDocument,
    variables: {
      ledgerId,
      account: deps.account,
      filter: deps.filter,
      time: deps.time,
      interval: cashFlowQueryDefaults.interval,
      conversion,
    },
  });
};
