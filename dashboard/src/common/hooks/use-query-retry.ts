import { useState } from "react";
import { usePendingAction } from "./use-pending-action";

/**
 * Re-runs a failed query in place, from the Try Again its error view offers
 * (w4/m50). One attempt at a time. Apollo clears `error` while it refetches,
 * so `failure` keeps the error being retried: the error view and its busy
 * Try Again stay mounted, and a rejected retry hands focus back to that
 * button. A rejection is handled here; the query's own `error` reports it.
 *
 * Render the error view on `failure` before any loading state.
 *
 * `scope` names what the query reads, for an owner that stays mounted while
 * it changes (another account or profile): a retry still pending then keeps
 * no failure for the new one.
 */
export function useQueryRetry<E>(
  error: E | undefined,
  refetch: () => Promise<unknown>,
  scope?: string,
) {
  const { run, pending } = usePendingAction();
  const [retried, setRetried] = useState(error);
  if (error && error !== retried) setRetried(error);
  const [retriedScope, setRetriedScope] = useState(scope);

  return {
    failure: error ?? (pending && retriedScope === scope ? retried : undefined),
    retrying: pending,
    retry: () => {
      setRetriedScope(scope);
      void run(() =>
        refetch().then(
          () => true,
          () => false,
        ),
      );
    },
  };
}
