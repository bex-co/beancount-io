import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerAccountMetaDocument } from "@/graphql/definitions";
import {
  toAccountMetaMap,
  type AccountMetaMap,
} from "@/features/reports/cash-flow/lib/model";

export interface AccountMetaState {
  /**
   * Declared roles per account once the open directives have loaded.
   * Undefined while pending and when the query failed — the latter degrades
   * metadata-dependent charts to the name heuristics, as before.
   */
  accountMeta: AccountMetaMap | undefined;
  /**
   * True while this ledger's directives are still loading with nothing
   * cached. Metadata-dependent charts must show a pending state then, not
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
  const { data, loading } = useQuery(GetLedgerAccountMetaDocument, {
    variables: { ledgerId },
    fetchPolicy: "cache-first",
  });
  const directives = data?.getLedgerAccountDirectives;
  const accountMeta = useMemo(
    () => (directives ? toAccountMetaMap(directives) : undefined),
    [directives],
  );
  return { accountMeta, pending: loading && !directives };
}
