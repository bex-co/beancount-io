import { useSyncExternalStore } from "react";

/** Nothing to subscribe to: the value changes once, when the client takes over. */
const subscribe = () => () => {};

/**
 * False while only the server-rendered markup exists, true once React has
 * attached its handlers.
 *
 * Credential forms use this to stay inert until they can be submitted through
 * the client. A server-rendered `<form>` with no handler still submits
 * natively, and a form without an explicit method defaults to GET — which puts
 * every field, password included, into the URL, and from there into history,
 * the referrer and any log that records request lines.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
