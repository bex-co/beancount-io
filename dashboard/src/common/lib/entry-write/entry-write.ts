import { useCallback, useMemo, useRef } from "react";
import { useApolloClient } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

/**
 * Retry-safe entry writes (w3/m61). Every entry save sends a `requestId`; the
 * server returns the first result to a repeat of the same id and request
 * instead of writing it twice.
 *
 * The id is this form's nonce plus a fingerprint of what is being saved, so a
 * double submit or a retry of the same entry reuses it, while editing the entry
 * mints a new one. The nonce is renewed after a save and whenever the form is
 * opened again, so two genuinely identical entries saved one after the other
 * (two coffees at the same price) stay two entries.
 */

/** Waits before retrying a write the server reports as still in progress. */
const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * The write may have landed: the server was still writing it after every
 * retry. The caller shows `common.errors.entryMaybeSaved` and the journal is
 * refreshed, so the user can see whether it is there before saving again.
 */
export class EntryWriteMaybeSavedError extends Error {
  constructor() {
    super("The entry write was still in progress after every retry");
    this.name = "EntryWriteMaybeSavedError";
  }
}

/** Whether `error` is the server's "this requestId is still writing" answer. */
export function isEntryWriteInProgress(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (gqlError) =>
        gqlError.extensions?.code === "CONFLICT" &&
        gqlError.extensions?.requestInProgress === true,
    )
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

/** A short, stable fingerprint (FNV-1a, 32-bit) of a JSON-able value. */
export function fingerprint(content: unknown): string {
  const text = JSON.stringify(content) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * A fresh client request id. `crypto.randomUUID` exists only in secure
 * contexts, so a plain-HTTP self-hosted dashboard falls back to time and
 * randomness; ledger creation uses the same ids.
 */
export function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The form's retry-safe write: `withRequestId(variables)` names a save, `send`
 * runs it with in-progress retries, and a save that may already have landed
 * refreshes the active queries (the journal among them) before it is shown.
 * The nonce renews after every save. The returned object is stable, so it can
 * sit in a callback's dependencies.
 */
export function useEntryWrite() {
  const client = useApolloClient();
  const nonce = useRef<string | null>(null);
  const withRequestId = useCallback(
    <V extends object>(variables: V): V & { requestId: string } => {
      nonce.current ??= newRequestId();
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
          await client.refetchQueries({ include: "active" }).catch(() => {});
        }
        throw error;
      }
    },
    [client],
  );
  return useMemo(() => ({ withRequestId, send }), [withRequestId, send]);
}
