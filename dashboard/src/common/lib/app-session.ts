/**
 * The query parameter the Beancount apps add to every beancount.io page they
 * open. An in-app browser is not a React Native web view, so without it those
 * pages would show pricing and Checkout inside the app, which App Review's
 * guideline 3.1.1 forbids (ADR 001 D14).
 */
export const APP_MARKER_PARAM = "beancount_app";

const STORAGE_KEY = "beancount.appSession";

/**
 * Whether this tab was opened by an app. The tab keeps the answer for its
 * session, so a link followed from the first page stays marked. It is
 * `sessionStorage` rather than a cookie because Android's custom tabs share
 * Chrome's cookies, and a cookie would hide billing in the person's own
 * browser. The server cannot see it, so it answers false there.
 */
export function isAppSession(): boolean {
  if (typeof window === "undefined") return false;
  const marked = new URLSearchParams(window.location.search).has(
    APP_MARKER_PARAM,
  );
  try {
    if (marked) window.sessionStorage.setItem(STORAGE_KEY, "1");
    return marked || window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Without storage the marker lasts as long as the URL carries it.
    return marked;
  }
}
