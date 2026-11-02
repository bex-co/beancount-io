const SITE = "https://beancount.io";

/**
 * A beancount.io page in the app's language. The site serves each translated
 * page under a bare language prefix (`/de/docs/help-center`) and the
 * unprefixed URL stays English whatever the browser asks for, so the prefix
 * is built here (w21/286). English has none.
 */
function localizedSiteUrl(path: string, locale: string): string {
  return /^[a-z]{2}$/.test(locale) && locale !== "en"
    ? `${SITE}/${locale}${path}`
    : `${SITE}${path}`;
}

export const helpCenterUrl = (locale: string): string =>
  localizedSiteUrl("/docs/help-center", locale);

const OWN_PAGE = /^https?:\/\/(?:[^/?#@]+\.)?beancount\.io(?:[:/?#]|$)/i;
const APP_MARKER = "beancount_app=1";

/**
 * A URL as the app must open it: a beancount.io page carries the marker that
 * keeps pricing and billing off it (ADR 001 D14, `dashboard/src/common/lib/
 * app-session.ts`), and any other site is left alone. Built as text because
 * React Native's `URL` has no working `searchParams`.
 */
export function withAppMarker(url: string): string {
  if (!OWN_PAGE.test(url) || url.includes(APP_MARKER)) return url;
  const hashAt = url.indexOf("#");
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  return `${base}${base.includes("?") ? "&" : "?"}${APP_MARKER}${hash}`;
}
