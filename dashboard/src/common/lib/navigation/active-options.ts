import type { LinkProps } from "@tanstack/react-router";

/**
 * `Link` defaults to prefix matching (`activeOptions.exact === false`), and an
 * active link automatically gets `aria-current="page"`. For a navigation link
 * that is an ancestor of the current URL — the ledger owner, the Overview of
 * the ledger you are reading the journal of — that means claiming to be the
 * current page while something else is. Match the destination exactly instead.
 *
 * `includeSearch` stays off because the sidebar propagates filters such as
 * `time` into its hrefs: the Journal link is still the current page on a
 * filtered journal URL, and with `exact` the router would otherwise require the
 * whole search object to be deep-equal.
 */
export const EXACT_PAGE_LINK: Pick<LinkProps, "activeOptions"> = {
  activeOptions: { exact: true, includeSearch: false },
};
