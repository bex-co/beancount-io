/** Stable target for the dashboard/ledger shell skip link. */
export const MAIN_CONTENT_ID = "main-content";

/**
 * Move keyboard focus (and the viewport) to the main content region.
 * Used by the skip link so activation is not merely a URL hash change.
 */
export function focusMainContent(): void {
  const main = document.getElementById(MAIN_CONTENT_ID);
  if (!main) return;
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: "start" });
}
