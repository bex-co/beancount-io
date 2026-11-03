import { useCallback, useMemo, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import { invalidateLedgerData } from "./apollo/invalidate-ledger";
import { graphQLErrorExtensions } from "./graphql-error-codes";
import { fnv1a32, newRequestId } from "./request-id";

/**
 * Retry-safe entry writes (w3/m61). Every entry save sends a `requestId`; the
 * server returns the first result to a repeat of the same id and request
 * instead of writing it twice.
 *
 * The id is this screen's nonce plus a fingerprint of what is being saved, so
 * a double tap or a retry of the same entry reuses it, while editing the entry
 * mints a new one. The nonce is renewed after a save, so two genuinely
 * identical entries saved one after the other stay two entries.
 */

/** Waits before retrying a write the server reports as still in progress. */
const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * The write may have landed: the server was still writing it after every
 * retry. `ledgerWriteFailureMessage` says the save was not confirmed, and the
 * ledger's data is refreshed so the user can check before saving again.
 */
export class EntryWriteMaybeSavedError extends Error {
  constructor() {
    super("The entry write was still in progress after every retry");
    this.name = "EntryWriteMaybeSavedError";
  }
}

/** Whether `error` is the server's "this requestId is still writing" answer. */
export function isEntryWriteInProgress(error: unknown): boolean {
  return graphQLErrorExtensions(error).some(
    (extensions) =>
      extensions.code === "CONFLICT" && extensions.requestInProgress === true,
  );
}

/**
 * Send `write`, retrying with the same request (and so the same id) while the
 * server reports the first attempt as still in progress. Any other failure is
 * the caller's to show, unchanged.
 */
export async function sendEntryWrite<T>(
  write: () => Promise<T>,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write();
    } catch (error) {
      if (!isEntryWriteInProgress(error)) throw error;
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw new EntryWriteMaybeSavedError();
      }
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/** A short, stable fingerprint of a JSON-able value. */
export function fingerprint(content: unknown): string {
  return fnv1a32(content).toString(16).padStart(8, "0");
}

/**
 * The screen's retry-safe write: `withRequestId(variables)` names a save,
 * `send` runs it with in-progress retries, and a save that may already have
 * landed refreshes the ledger's data before it is reported. The nonce renews
 * after every save. The returned object is stable, so it can sit in a
 * callback's dependencies.
 */
export function useEntryWrite() {
  const client = useApolloClient();
  const nonce = useRef<string | null>(null);
  const withRequestId = useCallback(
    <V extends object>(variables: V): V & { requestId: string } => {
      nonce.current ??= newRequestId("w");
      return {
        ...variables,
        requestId: `${nonce.current}-${fingerprint(variables)}`,
      };
    },
    [],
  );
  const send = useCallback(
    async <T>(write: () => Promise<T>): Promise<T> => {
      try {
        const result = await sendEntryWrite(write);
        nonce.current = null;
        return result;
      } catch (error) {
        if (error instanceof EntryWriteMaybeSavedError) {
          nonce.current = null;
          await invalidateLedgerData(client, "entries");
        }
        throw error;
      }
    },
    [client],
  );
  return useMemo(() => ({ withRequestId, send }), [withRequestId, send]);
}
