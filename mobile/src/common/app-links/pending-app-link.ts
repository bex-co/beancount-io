import type { AppLinkTarget } from "./resolve-app-link";

export type PendingAppLink = {
  target: AppLinkTarget;
  sourceUrl: string;
};

const GLOBAL_KEY = "__beancountPendingAppLink";

type PendingStore = {
  pending: PendingAppLink | null;
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
    g[GLOBAL_KEY] = { pending: null };
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
  store().pending = null;
}
