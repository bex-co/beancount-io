import { useCallback, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { useBulkEntriesMutation } from "@/generated-graphql/graphql";
import { useEntryWrite } from "@/common/entry-write";
import { createSingleFlight } from "@/common/single-flight";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { i18n } from "@/translations";
import type { AddEntryInput } from "@/generated-graphql/types";

/** Outcome of a single-entry write. Callers report failure one shape. */
export type SingleEntryWriteResult =
  { ok: true } | { ok: false; message: string | null };

/**
 * One `bulkEntries` write of a single built entry (a budget save, an account
 * open), guarded so a second press while the save and its refresh run does
 * nothing instead of writing twice (w21/193).
 *
 * `haptics` keeps the account-open behavior: its screen owns no haptics, so
 * the hook reports success and failure itself. Screens that already answer
 * the result themselves (a budget save) leave it off.
 */
export function useSingleEntryWrite<TInput>(
  ledgerId: string,
  buildEntry: (input: TInput) => AddEntryInput,
  options?: { haptics?: boolean },
): {
  writeEntry: (input: TInput) => Promise<SingleEntryWriteResult | null>;
  loading: boolean;
} {
  const client = useApolloClient();
  const [bulkEntries] = useBulkEntriesMutation();
  const entryWrite = useEntryWrite();
  // Busy for the whole write, the refresh after it included. The mutation's
  // own `loading` ends before that refresh, and for that window Done was
  // live again: a second tap wrote twice (w21/193).
  const [loading, setLoading] = useState(false);
  const flight = useRef(createSingleFlight(setLoading)).current;
  const withHaptics = options?.haptics ?? false;

  const writeEntry = useCallback(
    // `null`: a write was already running, so this press did nothing.
    async (input: TInput): Promise<SingleEntryWriteResult | null> =>
      (await flight.run(async (): Promise<SingleEntryWriteResult> => {
        try {
          const { data } = await entryWrite.send(() =>
            bulkEntries({
              variables: entryWrite.withRequestId({
                ledgerId,
                entries: [buildEntry(input)],
              }),
            }),
          );

          if (data?.bulkEntries.success) {
            // Awaited so the list the caller returns to is already correct.
            // Fired here rather than at the call site so a screen cannot
            // write without it, the same reason `runLedgerWrite` owns the
            // haptic for the transaction flows.
            if (withHaptics) haptics.success();
            await invalidateLedgerData(client, "entries");
            return { ok: true };
          }

          if (withHaptics) haptics.error();
          return {
            ok: false,
            message: data?.bulkEntries.message?.trim() || null,
          };
        } catch (caught) {
          if (withHaptics) haptics.error();
          return {
            ok: false,
            message: ledgerWriteFailureMessage(caught, i18n),
          };
        }
      })) ?? null,
    [bulkEntries, entryWrite, client, ledgerId, buildEntry, withHaptics],
  );

  return { writeEntry, loading };
}
