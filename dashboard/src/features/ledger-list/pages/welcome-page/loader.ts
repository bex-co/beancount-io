import { redirect } from "@tanstack/react-router";
import type { RouteLoader } from "@/common/types/route-loader";
import {
  ListLedgersDocument,
  type ListLedgersQuery,
} from "@/graphql/definitions";
import { decodeLedgerId } from "@/common/lib/utils/encode";

export const welcomeLoader: RouteLoader<"/auth/welcome"> = async ({
  context,
}) => {
  if (!context.userProfile) {
    throw redirect({
      to: "/auth/login",
    });
  }

  const result = await context.client.query<ListLedgersQuery>({
    query: ListLedgersDocument,
  });

  const ledgers = result.data?.listLedgers ?? [];

  if (ledgers.length > 0) {
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledgers[0].id);
    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName",
      params: { ledgerOwner, ledgerName },
    });
  }
};
