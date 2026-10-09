/**
 * Whether the tab strip has labels past its trailing edge. The strip scrolls
 * instead of truncating tab names and hides its scroll indicator, so a fade at
 * that edge is the only sign a tab is out of view. Where the labels happen to
 * end on a word boundary at the edge (Russian's "Активы"), nothing else shows
 * that a third tab exists.
 */
export function tabStripHasMoreAfter({
  contentWidth,
  viewportWidth,
  offset,
}: {
  contentWidth: number;
  viewportWidth: number;
  offset: number;
}): boolean {
  return viewportWidth > 0 && contentWidth - viewportWidth - offset > 1;
}

/**
 * Narrowest tab viewport worth keeping beside the trailing action, even when
 * every label is short: below this the strip is a sliver nobody can aim at.
 */
const MIN_TAB_VIEWPORT = 160;

/**
 * Whether the trailing action ("See all") should move to its own row. It shares
 * the tab row while the remaining viewport can still show the widest tab whole
 * (and at least {@link MIN_TAB_VIEWPORT}), so scrolling reveals every label.
 * Enlarged or long translated text breaks that, and then the tabs get the full
 * width. A strip whose labels all fit in less never needs more. Widths are the
 * header row's and the action's natural width, so the answer holds once the
 * action has moved.
 */
export function trailingNeedsOwnRow({
  rowWidth,
  trailingWidth,
  tabsContentWidth,
  widestTabWidth,
}: {
  rowWidth: number;
  trailingWidth: number;
  tabsContentWidth: number;
  widestTabWidth: number;
}): boolean {
  if (rowWidth <= 0 || trailingWidth <= 0) return false;
  const wanted = Math.max(MIN_TAB_VIEWPORT, widestTabWidth);
  const needed =
    tabsContentWidth > 0 ? Math.min(tabsContentWidth, wanted) : wanted;
  return rowWidth - trailingWidth < needed;
}
