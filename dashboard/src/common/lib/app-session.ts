/**
 * The query parameter the Beancount apps add to every beancount.io page they
 * open. An in-app browser is not a React Native web view, so without it those
 * pages would show pricing and Checkout inside the app, which App Review's
 * guideline 3.1.1 forbids (ADR 001 D14).
 */
export const APP_MARKER_PARAM = "beancount_app";

const STORAGE_KEY = "beancount.appSession";

const markedUrl = () =>
  new URLSearchParams(window.location.search).has(APP_MARKER_PARAM);

/**
 * Keep the marker for the tab, so a link followed from the first page stays
 * marked. `sessionStorage` rather than a cookie, because Android's custom tabs
 * share Chrome's cookies, and a cookie would hide billing in the person's own
 * browser. Called once, when the app starts on the client.
 */
export function rememberAppSession(): void {
  if (typeof window === "undefined" || !markedUrl()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Without storage the marker lasts as long as the URL carries it.
  }
}

/** Whether an app opened this tab. The server cannot see it, so it answers false there. */
export function isAppSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return markedUrl() || window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return markedUrl();
  }
}
