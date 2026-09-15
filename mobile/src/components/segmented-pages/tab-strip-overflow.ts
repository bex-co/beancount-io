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
