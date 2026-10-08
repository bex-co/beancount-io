/**
 * How each browser reports a dynamic import whose file is gone, plus Vite's
 * message for a stylesheet it could not preload. After a deploy these mean the
 * open page belongs to a build whose assets no longer exist.
 */
const CHUNK_LOAD_MESSAGES = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "Unable to preload CSS",
];

export function isChunkLoadError(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  return (
    typeof message === "string" &&
    CHUNK_LOAD_MESSAGES.some((prefix) => message.startsWith(prefix))
  );
}

const RELOAD_KEY = "beancount.staleChunkReloadAt";
const RELOAD_WINDOW_MS = 60_000;

/**
 * Reloads the page to pick up the current build, at most once per window so a
 * chunk that is still missing after the reload surfaces as an error instead of
 * a reload loop. Returns whether a reload was started.
 */
export function reloadOnceForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Without storage there is no loop guard, so do not reload automatically.
    return false;
  }
  window.location.reload();
  return true;
}
