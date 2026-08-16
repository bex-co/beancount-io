import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { useBulkEntriesMutation } from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import {
  buildOpenAccountEntry,
  type OpenAccountInput,
} from "./open-account-entry";

export type OpenAccountResult =
  { ok: true } | { ok: false; message: string | null };

export function useOpenAccount(ledgerId: string) {
  const client = useApolloClient();
  const [bulkEntries, { loading }] = useBulkEntriesMutation();

  const openAccount = useCallback(
    async (input: OpenAccountInput): Promise<OpenAccountResult> => {
      try {
        const { data } = await bulkEntries({
          variables: {
            ledgerId,
            entries: [buildOpenAccountEntry(input)],
          },
        });

        if (data?.bulkEntries.success) {
          // Awaited so the account name and the balance hierarchy the Accounts
          // tab is about to show are current before we navigate back. The
          // queries run in parallel, so this costs the slowest one, not the sum
          // — and it never rejects: the directive has already been committed,
          // and reporting a refresh failure as an open failure could get it
          // written twice.
          // Fired here rather than at the call site so the screen cannot open an
          // account without it, the same reason `runLedgerWrite` owns the
          // haptic for the transaction flows.
          haptics.success();
          await invalidateLedgerData(client, "entries");
          return { ok: true };
        }

        haptics.error();
        const message = data?.bulkEntries.message?.trim() || null;
        return { ok: false, message };
      } catch (caught) {
        haptics.error();
        const message = caught instanceof Error ? caught.message : null;
        return { ok: false, message };
      }
    },
    [bulkEntries, client, ledgerId],
  );

  return { openAccount, loading };
}
