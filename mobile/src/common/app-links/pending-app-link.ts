import type { AppLinkTarget } from "./resolve-app-link";

export type PendingAppLink = {
  target: AppLinkTarget;
  sourceUrl: string;
};

const GLOBAL_KEY = "__beancountPendingAppLink";

type PendingStore = {
  pending: PendingAppLink | null;
  /** The link a sign-in in progress will open itself (w21/686). */
  held: PendingAppLink | null;
};

/**
 * Store pending links on `globalThis` so `+native-intent` (evaluated while
 * Expo Router builds the initial URL) and the React tree share one slot.
 * A module-local `let` can be duplicated across Metro graphs and silently
 * drop the stash before sign-in replay.
 */
function store(): PendingStore {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: PendingStore;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { pending: null, held: null };
  }
  return g[GLOBAL_KEY];
}

/**
 * Pending universal-link target that survives the welcome / OAuth round trip
 * within the same process. Consumed once after sign-in.
 */
export function setPendingAppLink(
  target: AppLinkTarget,
  sourceUrl: string,
): void {
  store().pending = { target, sourceUrl };
}

export function peekPendingAppLink(): PendingAppLink | null {
  return store().pending;
}

export function takePendingAppLink(): PendingAppLink | null {
  const slot = store();
  const next = slot.pending;
  slot.pending = null;
  return next;
}

export function clearPendingAppLink(): void {
  const slot = store();
  slot.pending = null;
  slot.held = null;
}

/**
 * Take the pending link out of the slot the session effect reads, for the
 * sign-in finisher to open. Setting the session re-renders the link handler
 * before the finisher's own requests return: both took the slot, the effect
 * first, and the finisher then found it empty and restored the guest view or
 * Home over the opened link (w21/686). One reader: the finisher.
 */
export function holdPendingAppLinkForSignIn(): void {
  const slot = store();
  if (slot.pending) {
    slot.held = slot.pending;
    slot.pending = null;
  }
}

/** The link held for the sign-in finisher, consumed once. */
export function takeHeldAppLink(): PendingAppLink | null {
  const slot = store();
  const held = slot.held;
  slot.held = null;
  return held;
}

/**
 * Give an unused held link back to the pending slot once the sign-in has
 * finished or failed, unless a newer link arrived meanwhile.
 */
export function releaseHeldAppLink(): void {
  const slot = store();
  if (slot.held && !slot.pending) slot.pending = slot.held;
  slot.held = null;
}

/**
 * Where an incoming link goes. Signed out, it waits in the slot for sign-in.
 * Signed in, it opens now, and the slot is cleared: `rewriteSystemPath`
 * stashes every link it resolves, and a stash left behind replayed on the
 * next sign-in, possibly as another account (w21/083).
 *
 * @returns Whether the caller should open the link now.
 */
export function routeIncomingAppLink(
  target: AppLinkTarget,
  sourceUrl: string,
  signedIn: boolean,
): boolean {
  if (!signedIn) {
    setPendingAppLink(target, sourceUrl);
    return false;
  }
  clearPendingAppLink();
  return true;
}
