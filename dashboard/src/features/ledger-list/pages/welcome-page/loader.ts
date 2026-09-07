import { redirect } from "@tanstack/react-router";
import type { RouteLoader } from "@/common/types/route-loader";
import {
  ListLedgersDocument,
  type ListLedgersQuery,
} from "@/graphql/definitions";
import { decodeLedgerId } from "@/common/lib/utils/encode";

export const welcomeLoader = async ({
  context,
  deps,
}: Parameters<RouteLoader<"/auth/welcome">>[0] & {
  deps: { oauthUid?: string; oauthScope?: string };
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
    if (deps.oauthUid) {
      throw redirect({
        to: "/oauth/consent",
        search: { uid: deps.oauthUid, scope: deps.oauthScope },
      });
    }
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledgers[0].id);
    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName",
      params: { ledgerOwner, ledgerName },
    });
  }
};
