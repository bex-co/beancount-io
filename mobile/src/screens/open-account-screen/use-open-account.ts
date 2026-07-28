import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import {
  LedgerMetaDocument,
  TrialBalanceDocument,
  useBulkEntriesMutation,
} from "@/generated-graphql/graphql";
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
          // These are active while this screen is pushed from Accounts. Await
          // both so the name and balance hierarchy are current before going back.
          // A refresh failure must not be reported as an open failure: the
          // directive has already been committed and retrying could duplicate it.
          try {
            await client.refetchQueries({
              include: [TrialBalanceDocument, LedgerMetaDocument],
            });
          } catch {
            // The Accounts tab still has pull-to-refresh as a recovery path.
          }
          return { ok: true };
        }

        const message = data?.bulkEntries.message?.trim() || null;
        return { ok: false, message };
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : null;
        return { ok: false, message };
      }
    },
    [bulkEntries, client, ledgerId],
  );

  return { openAccount, loading };
}
