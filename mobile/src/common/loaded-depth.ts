import { useCallback, useEffect, useRef } from "react";
import { NetworkStatus } from "@apollo/client";

/**
 * A paged list re-runs its first page when the app returns to the foreground
 * or any write invalidates the ledger, which replaces the rows the reader had
 * scrolled to with the newest page and throws away their place (w21/526).
 * This keeps the depth the reader reached, and asks for the rows beyond the
 * first page again once it lands, so the view does not jump.
 */

/** Rows one restore asks for at most, so a deep list returns in a few reads. */
const RESTORE_CHUNK = 100;

export type DepthState = {
  listKey: string;
  /** The most rows the reader has had on screen for this list. */
  depth: number;
  prevStatus: NetworkStatus | undefined;
  /** A pull to refresh asked for the first page: do not restore past it. */
  forgetting: boolean;
  /** The restore last asked for, so a failed one is not repeated in a loop. */
  attempted: string | null;
};

export type DepthInput = {
  listKey: string;
  count: number;
  total: number;
  networkStatus: NetworkStatus;
};

export type DepthPlan = {
  state: DepthState;
  /** The first page was re-run and landed. */
  reloaded: boolean;
  /** Rows to fetch from the end of what is shown, or null. */
  restoreLimit: number | null;
};

export function initialDepthState(listKey = ""): DepthState {
  return {
    listKey,
    depth: 0,
    prevStatus: undefined,
    forgetting: false,
    attempted: null,
  };
}

export function planDepth(prev: DepthState, input: DepthInput): DepthPlan {
  const { count, total, networkStatus } = input;
  const state =
    prev.listKey === input.listKey ? prev : initialDepthState(input.listKey);
  const reloaded =
    state.prevStatus === NetworkStatus.refetch &&
    networkStatus === NetworkStatus.ready;
  const next = { ...state, prevStatus: networkStatus };

  if (state.forgetting) {
    if (reloaded) {
      next.forgetting = false;
      next.depth = count;
    } else if (
      state.prevStatus === NetworkStatus.refetch &&
      networkStatus === NetworkStatus.error
    ) {
      next.forgetting = false;
    }
    return { state: next, reloaded, restoreLimit: null };
  }

  next.depth = Math.min(Math.max(state.depth, count), Math.max(total, count));
  const ready = networkStatus === NetworkStatus.ready;
  if (!ready || count <= 0 || count >= next.depth) {
    return { state: next, reloaded, restoreLimit: null };
  }
  const key = `${count}->${next.depth}`;
  if (state.attempted === key) {
    return { state: next, reloaded, restoreLimit: null };
  }
  next.attempted = key;
  return {
    state: next,
    reloaded,
    restoreLimit: Math.min(next.depth - count, RESTORE_CHUNK),
  };
}

/** The reader asked for the first page (pull to refresh): drop the depth. */
export function forgetDepth(state: DepthState): DepthState {
  return { ...state, depth: 0, forgetting: true, attempted: null };
}

/**
 * @param restore fetches `limit` rows after the ones shown, ignoring a stale
 *   "couldn't load more" state.
 * @param onReload runs whenever the first page is re-run and lands, so a
 *   leftover paging failure is cleared.
 * @returns `forget`, to call before a pull to refresh refetches.
 */
export function useLoadedDepth(
  input: DepthInput,
  restore: (limit: number) => void,
  onReload?: () => void,
): () => void {
  const stateRef = useRef(initialDepthState(input.listKey));
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const reloadRef = useRef(onReload);
  reloadRef.current = onReload;
  const { listKey, count, total, networkStatus } = input;

  useEffect(() => {
    const plan = planDepth(stateRef.current, {
      listKey,
      count,
      total,
      networkStatus,
    });
    stateRef.current = plan.state;
    if (plan.reloaded) reloadRef.current?.();
    if (plan.restoreLimit) restoreRef.current(plan.restoreLimit);
  }, [listKey, count, total, networkStatus]);

  return useCallback(() => {
    stateRef.current = forgetDepth(stateRef.current);
  }, []);
}
