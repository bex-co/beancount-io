/**
 * When returning to an open tab refreshes what is on screen. Tabs stay mounted
 * and fetch once per mount, so after a change made elsewhere Home and
 * Transactions kept the old data while a tab visited for the first time showed
 * the new (w21/837). A return to a visited tab refreshes at most once per
 * `minIntervalMs` across all tabs, so tapping around sends one refetch.
 *
 * Free of React Native and `@/` imports so the unit runner can drive it.
 */
export function createTabFocusGate(
  now: () => number = Date.now,
  minIntervalMs = 30_000,
): () => boolean {
  let last = Number.NEGATIVE_INFINITY;
  return () => {
    const at = now();
    if (at - last < minIntervalMs) return false;
    last = at;
    return true;
  };
}

/** The gate every tab shares. */
export const tabFocusRefreshDue = createTabFocusGate();
