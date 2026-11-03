import { useCallback, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { useBulkEntriesMutation } from "@/generated-graphql/graphql";
import { useEntryWrite } from "@/common/entry-write";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import { createSingleFlight } from "@/common/single-flight";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { i18n } from "@/translations";
import {
  buildOpenAccountEntry,
  type OpenAccountInput,
} from "./open-account-entry";

export type OpenAccountResult =
  { ok: true } | { ok: false; message: string | null };

export function useOpenAccount(ledgerId: string) {
  const client = useApolloClient();
  const [bulkEntries] = useBulkEntriesMutation();
  const entryWrite = useEntryWrite();
  // Busy for the whole open, the refresh after the write included: the
  // mutation's `loading` ended before it, leaving Done live (w21/193).
  const [loading, setLoading] = useState(false);
  const flight = useRef(createSingleFlight(setLoading)).current;

  const openAccount = useCallback(
    // `null`: an open was already running, so this press did nothing.
    async (input: OpenAccountInput): Promise<OpenAccountResult | null> =>
      (await flight.run(async (): Promise<OpenAccountResult> => {
        try {
          const { data } = await entryWrite.send(() =>
            bulkEntries({
              variables: entryWrite.withRequestId({
                ledgerId,
                entries: [buildOpenAccountEntry(input)],
              }),
            }),
          );

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
          return {
            ok: false,
            message: ledgerWriteFailureMessage(caught, i18n),
          };
        }
      })) ?? null,
    [bulkEntries, entryWrite, client, ledgerId, flight],
  );

  return { openAccount, loading };
}
