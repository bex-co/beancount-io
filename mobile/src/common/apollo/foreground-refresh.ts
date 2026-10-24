/**
 * Decides when a return to the app refreshes what is on screen. Each screen
 * revalidates once per mount (`default-options.ts`), but tabs stay mounted for
 * the whole session: after a change made by an agent, the CLI or the web,
 * Home kept a removed transaction and the old net worth while a tab mounted
 * later showed the current ledger (w21/024).
 *
 * Refreshes on a return to `active` from the background or inactive, at most
 * once per `minIntervalMs`, so rapid app switching sends one refetch. A return
 * inside the window refreshes once when it ends. The handler's `cancel` drops
 * that pending run: left to fire after a log out, it sent a request with no
 * session and was read as one that had ended (w21/924). Free of
 * React Native and `@/` imports so the unit runner can drive it.
 */
export function createForegroundRefresher({
  refresh,
  now = Date.now,
  minIntervalMs = 30_000,
  schedule = (run: () => void, delayMs: number) => {
    const timer = setTimeout(run, delayMs);
    return () => clearTimeout(timer);
  },
}: {
  refresh: () => void;
  now?: () => number;
  minIntervalMs?: number;
  /** Runs `run` after `delayMs`, returning how to cancel it; a test supplies its own clock. */
  schedule?: (run: () => void, delayMs: number) => (() => void) | void;
}): ((nextState: string) => void) & { cancel: () => void } {
  let previous = "active";
  let lastRefresh = Number.NEGATIVE_INFINITY;
  let pending = false;
  let cancelPending: (() => void) | void;
  let cancelled = false;
  const handler = (nextState: string) => {
    const returned = nextState === "active" && previous !== "active";
    previous = nextState;
    if (!returned) return;
    const at = now();
    if (at - lastRefresh < minIntervalMs) {
      // Inside the window the return is deferred, not dropped: a change made
      // meanwhile stayed hidden until the next return or a relaunch (w21/838).
      if (!pending) {
        pending = true;
        cancelPending = schedule(
          () => {
            pending = false;
            if (cancelled) return;
            lastRefresh = now();
            refresh();
          },
          lastRefresh + minIntervalMs - at,
        );
      }
      return;
    }
    lastRefresh = at;
    refresh();
  };
  return Object.assign(handler, {
    cancel: () => {
      cancelled = true;
      cancelPending?.();
      cancelPending = undefined;
      pending = false;
    },
  });
}
