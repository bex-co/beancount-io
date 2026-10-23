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
  rtl = false,
}: {
  contentWidth: number;
  viewportWidth: number;
  offset: number;
  /**
   * An RTL ScrollView on iOS reports `contentOffset.x` as the distance still to
   * scroll toward the trailing (left) edge: largest at the visual start, 0 at
   * the end. Read from the start, as an LTR strip's is, the fade was false while
   * a tab was hidden and true once all showed (w21/887).
   */
  rtl?: boolean;
}): boolean {
  if (viewportWidth <= 0) return false;
  return rtl
    ? contentWidth > viewportWidth && offset > 1
    : contentWidth - viewportWidth - offset > 1;
}

/**
 * Where to scroll the tab strip so the tapped tab shows whole, or `null` when
 * it already does. A tab cut off at the trailing edge stayed cut off after it
 * was selected ("Liabilitie" under the fade) (w21/886). `gutter` leaves a little
 * of the strip beyond it.
 */
export function tabRevealScrollX({
  tabX,
  tabWidth,
  viewportWidth,
  offset,
  gutter = 12,
}: {
  tabX: number;
  tabWidth: number;
  viewportWidth: number;
  offset: number;
  gutter?: number;
}): number | null {
  if (viewportWidth <= 0 || tabWidth <= 0) return null;
  if (tabX >= offset && tabX + tabWidth <= offset + viewportWidth) return null;
  if (tabX < offset) return Math.max(0, tabX - gutter);
  return tabX + tabWidth - viewportWidth + gutter;
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
