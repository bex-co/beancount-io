import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useHydrated } from "@tanstack/react-router";
import { GetLedgerAccountMetaDocument } from "@/graphql/definitions";
import {
  toAccountMetaMap,
  type AccountMetaMap,
} from "@/features/reports/cash-flow/lib/model";

export interface AccountMetaState {
  /**
   * Declared roles per account once the open directives have loaded.
   * Undefined while the query loads and when it failed — the latter degrades
   * metadata-dependent charts to the name heuristics, as before.
   */
  accountMeta: AccountMetaMap | undefined;
  /**
   * True during hydration or while this ledger's directives are still
   * loading with nothing cached. Metadata-dependent charts show pending, not
   * heuristic output: a declared `cash-flow-role` is authoritative and may
   * still arrive.
   */
  pending: boolean;
}

/**
 * Account open-directive metadata (cash-flow-role declarations) for the
 * overview. Fetched apart from the overview query so a failure — or an older
 * backend — degrades the Sankey to heuristics instead of failing the page,
 * and reported with an explicit pending flag so the page never presents the
 * heuristic result as final while the declarations are still on their way.
 */
export function useAccountMeta(ledgerId: string): AccountMetaState {
  const hydrated = useHydrated();
  const { data, loading } = useQuery(GetLedgerAccountMetaDocument, {
    variables: { ledgerId },
    fetchPolicy: "cache-first",
  });
  const directives = data?.getLedgerAccountDirectives;
  const accountMeta = useMemo(
    () => (directives ? toAccountMetaMap(directives) : undefined),
    [directives],
  );
  // A browser loader can prefetch roles before the server's pending panel
  // hydrates. Keep that first render stable even when the cache is now warm.
  return { accountMeta, pending: !hydrated || (loading && !directives) };
}
