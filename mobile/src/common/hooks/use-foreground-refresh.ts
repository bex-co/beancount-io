import { useEffect } from "react";
import { AppState } from "react-native";
import { useApolloClient } from "@apollo/client";
import { createForegroundRefresher } from "@/common/apollo/foreground-refresh";
import { ledgerRevisionVar } from "@/common/apollo/invalidate-ledger";
import { refreshOnForeground } from "@/common/apollo/refresh-on-foreground";

/**
 * Refetch every query on screen when the app returns to the foreground, so a
 * mounted tab catches up with changes made elsewhere (w21/024). Cached data
 * stays on screen while the network answers; an offline return keeps it. The
 * ledger revision is bumped too, which re-runs the budget panel's reads.
 */
export function useForegroundRefresh(enabled: boolean): void {
  const client = useApolloClient();
  useEffect(() => {
    if (!enabled) return undefined;
    const onChange = createForegroundRefresher({
      refresh: () => {
        // Also wakes the readers that are not watched queries (the Home
        // budget panel) by bumping the ledger revision (w21/225).
        void refreshOnForeground(client, () =>
          ledgerRevisionVar(ledgerRevisionVar() + 1),
        );
      },
    });
    const subscription = AppState.addEventListener("change", onChange);
    return () => {
      subscription.remove();
      onChange.cancel();
    };
  }, [client, enabled]);
}
